// ==UserScript==
// @name         Fenix YT UI Playlist
// @namespace    fenix.youtube
// @version      1.3.0
// @description  Improves the YouTube Playlists UI: cleaner cards, compact 5-column layout, safer delete flow, and quick playlist creation.
// @description:ru Улучшает интерфейс плейлистов YouTube: очищает карточки, делает компактную сетку по 5, безопаснее переносит удаление и добавляет быстрое создание плейлистов.
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        createButtonText: '＋ Новый плейлист',
        deleteButtonText: '🗑 Удалить плейлист',
        newPlaylistPrivacy: 'PRIVATE',
        confirmDelete: true,
        playlistsPerRow: 5
    };

    const CARD_SELECTOR = [
        'ytd-playlist-renderer',
        'ytd-grid-playlist-renderer',
        'yt-lockup-view-model',
        'ytd-rich-item-renderer',
        'yt-content-metadata-view-model',
        'yt-lockup-metadata-view-model'
    ].join(',');

    const MENU_ITEM_SELECTOR = [
        'ytd-menu-service-item-renderer',
        'tp-yt-paper-item',
        'yt-list-item-view-model'
    ].join(',');

    const VIEW_LABELS = ['Посмотреть весь плейлист', 'View full playlist'];
    const DELETE_LABELS = ['Удалить', 'Delete'];

    let lastPlaylistCard = null;
    let scheduled = false;

    const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const getCards = () => [...document.querySelectorAll(CARD_SELECTOR)];

    function isPlaylistPage() {
        const path = location.pathname;
        if (path.includes('/feed/playlists') || path.includes('/playlists')) return true;

        const headings = [...document.querySelectorAll('h1, h2, yt-formatted-string')];
        if (headings.some(el => ['Плейлисты', 'Playlists'].includes(text(el)))) return true;

        const cards = getCards();
        if (cards.length < 2) return false;
        return cards.filter(card => card.querySelector('a[href*="/playlist?list="]')).length >= 2;
    }

    function isDeleteItem(el) {
        const value = text(el);
        return DELETE_LABELS.some(label => value === label || value.startsWith(label));
    }

    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const card = event.target.closest(CARD_SELECTOR);
        if (card) lastPlaylistCard = card;
    }, true);

    function injectStyles() {
        if (document.getElementById('fenix-yt-ui-playlist-styles')) return;

        const style = document.createElement('style');
        style.id = 'fenix-yt-ui-playlist-styles';
        style.textContent = `
            body.fenix-playlists-page ytd-rich-grid-renderer,
            body.fenix-playlists-page #contents.ytd-rich-grid-renderer,
            body.fenix-playlists-page ytd-rich-grid-row {
                --ytd-rich-grid-items-per-row: ${CONFIG.playlistsPerRow} !important;
                --ytd-rich-grid-posts-per-row: ${CONFIG.playlistsPerRow} !important;
            }

            @media (min-width: 1200px) {
                body.fenix-playlists-page ytd-rich-grid-row > #contents {
                    grid-template-columns: repeat(${CONFIG.playlistsPerRow}, minmax(0, 1fr)) !important;
                }
            }

            .fenix-view-playlist-button {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
                width: auto !important;
                min-height: 36px !important;
                margin-top: 8px !important;
                padding: 6px 12px !important;
                border: 1px solid rgba(255,255,255,.30) !important;
                border-radius: 18px !important;
                outline: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
                color: rgba(255,255,255,.88) !important;
                font: 500 13px/20px Roboto, Arial, sans-serif !important;
                text-decoration: none !important;
                cursor: pointer !important;
            }

            .fenix-view-playlist-button *,
            .fenix-view-playlist-button *::before,
            .fenix-view-playlist-button *::after,
            .fenix-view-playlist-button::before,
            .fenix-view-playlist-button::after {
                border: 0 !important;
                outline: 0 !important;
                box-shadow: none !important;
                background: transparent !important;
            }

            .fenix-view-playlist-button:hover {
                background: rgba(255,255,255,.09) !important;
                border-color: rgba(255,255,255,.48) !important;
            }

            #fenix-delete-playlist-wrapper {
                margin: 18px 20px 20px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,.10);
            }

            #fenix-delete-playlist-button {
                width: 100%;
                min-height: 42px;
                padding: 10px 16px;
                border: 1px solid #f15b55;
                border-radius: 18px;
                background: transparent;
                color: #ff716b;
                font: 500 14px Roboto, Arial, sans-serif;
                cursor: pointer;
            }

            #fenix-delete-playlist-button:hover {
                background: rgba(255,70,65,.12);
            }

            #fenix-create-playlist-button {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 9998;
                min-height: 42px;
                padding: 0 18px;
                border: 0;
                border-radius: 21px;
                background: #272727;
                color: #fff;
                font: 500 14px Roboto, Arial, sans-serif;
                box-shadow: 0 4px 16px rgba(0,0,0,.35);
                cursor: pointer;
            }

            #fenix-create-playlist-button:hover { background: #3a3a3a; }
            #fenix-create-playlist-button:active { transform: scale(.97); }
        `;
        document.head.appendChild(style);
    }

    function updatePageClass() {
        document.body?.classList.toggle('fenix-playlists-page', isPlaylistPage());
    }

    function cleanPlaylistMetadata() {
        if (!isPlaylistPage()) return;

        for (const card of getCards()) {
            const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let node;
            while ((node = walker.nextNode())) nodes.push(node);

            for (const textNode of nodes) {
                const original = textNode.nodeValue;
                if (!original) continue;

                let value = original
                    .replace(/\s*[·•|]\s*(Плейлист|Playlist)\b/gi, '')
                    .replace(/^\s*(Плейлист|Playlist)\s*$/gi, '')
                    .replace(/^\s*(Обновлено|Updated)\b.*$/giu, '')
                    .replace(/\s{2,}/g, ' ')
                    .replace(/\s*[·•|]\s*$/g, '')
                    .trim();

                if (value === original) continue;
                textNode.nodeValue = value;

                if (!value) {
                    const parent = textNode.parentElement;
                    if (parent && !text(parent)) parent.style.display = 'none';
                }
            }
        }
    }

    function styleViewPlaylistLinks() {
        if (!isPlaylistPage()) return;

        for (const card of getCards()) {
            card.querySelectorAll('.fenix-view-playlist-button').forEach(el => {
                el.classList.remove('fenix-view-playlist-button');
            });

            const buttons = [...card.querySelectorAll('button')];
            const links = [...card.querySelectorAll('a')];
            let target = buttons.find(el => VIEW_LABELS.includes(text(el)));
            if (!target) target = links.find(el => VIEW_LABELS.includes(text(el)));

            if (!target) {
                const label = [...card.querySelectorAll('yt-formatted-string, span')]
                    .find(el => VIEW_LABELS.includes(text(el)));
                target = label?.closest('button, a') || null;
            }

            target?.classList.add('fenix-view-playlist-button');
        }
    }

    function hideDeleteItems() {
        for (const item of document.querySelectorAll(MENU_ITEM_SELECTOR)) {
            if (!isDeleteItem(item)) continue;
            if (!item.closest('ytd-menu-popup-renderer, tp-yt-paper-listbox, [role="menu"]')) continue;
            item.style.display = 'none';
            item.dataset.fenixHiddenDelete = '1';
        }
    }

    function findEditDialog() {
        return [...document.querySelectorAll('tp-yt-paper-dialog, [role="dialog"], dialog')]
            .find(dialog => {
                const value = text(dialog);
                return value.includes('Редактирование') || value.includes('Edit');
            }) || null;
    }

    function findPlaylistMenuButton(card) {
        return card?.querySelector('ytd-menu-renderer yt-icon-button') ||
            card?.querySelector('button[aria-label*="меню" i]') ||
            card?.querySelector('button[aria-label*="действ" i]') ||
            card?.querySelector('button[aria-label*="menu" i]') ||
            card?.querySelector('yt-icon-button') || null;
    }

    function closeEditDialog(dialog) {
        const close = dialog?.querySelector('button[aria-label*="Закрыть" i], button[aria-label*="Close" i]');
        if (close) return void close.click();
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape', bubbles: true
        }));
    }

    async function runNativeDelete(dialog) {
        if (!lastPlaylistCard) {
            alert('Не удалось определить плейлист.\n\nЗакрой окно и снова открой его через:\n⋮ → Изменить');
            return;
        }

        if (CONFIG.confirmDelete) {
            const title = text(lastPlaylistCard.querySelector('#video-title, #title, a[href*="/playlist?list="]')) || 'этот плейлист';
            if (!confirm(`Удалить "${title}"?\n\nПосле этого YouTube ещё покажет своё штатное подтверждение.`)) return;
        }

        const menuButton = findPlaylistMenuButton(lastPlaylistCard);
        if (!menuButton) return void alert('Не удалось найти штатную кнопку меню плейлиста.');

        closeEditDialog(dialog);
        await sleep(350);
        menuButton.click();
        await sleep(350);

        const deleteItem = [...document.querySelectorAll(MENU_ITEM_SELECTOR)].find(isDeleteItem);
        if (!deleteItem) return void alert('YouTube не показал штатный пункт "Удалить".');

        deleteItem.style.display = '';
        deleteItem.click();
    }

    function addDeleteButton() {
        const dialog = findEditDialog();
        if (!dialog || dialog.querySelector('#fenix-delete-playlist-button')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'fenix-delete-playlist-wrapper';

        const button = document.createElement('button');
        button.id = 'fenix-delete-playlist-button';
        button.type = 'button';
        button.textContent = CONFIG.deleteButtonText;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            runNativeDelete(dialog);
        });

        wrapper.appendChild(button);
        dialog.appendChild(wrapper);
    }

    async function createPlaylist() {
        const title = prompt('Название нового плейлиста:')?.trim();
        if (!title) return;

        const app = document.querySelector('ytd-app');
        if (!app) return void alert('Не удалось получить интерфейс YouTube.');

        const returnValue = [];

        try {
            app.dispatchEvent(new CustomEvent('yt-action', {
                detail: {
                    actionName: 'yt-service-request',
                    returnValue,
                    args: [
                        { data: {} },
                        {
                            commandMetadata: {
                                webCommandMetadata: {
                                    sendPost: true,
                                    apiUrl: '/youtubei/v1/playlist/create'
                                }
                            },
                            createPlaylistServiceEndpoint: {
                                videoIds: [],
                                title,
                                privacyStatus: CONFIG.newPlaylistPrivacy
                            }
                        }
                    ],
                    optionalAction: false
                }
            }));

            for (let i = 0; i < 10 && returnValue.length === 0; i++) await sleep(100);
            if (returnValue.length === 0) throw new Error('YouTube did not return yt-service-request result.');

            const response = returnValue.at(-1);
            if (response?.ajaxPromise) await response.ajaxPromise;

            if (confirm(`Плейлист "${title}" создан.\n\nОбновить страницу, чтобы увидеть его?`)) {
                location.reload();
            }
        } catch (error) {
            console.error('[Fenix YT UI Playlist]', error);
            alert('Не удалось создать плейлист.\n\nYouTube мог изменить внутренний API.\nОткрой F12 → Console.');
        }
    }

    function addCreateButton() {
        const id = 'fenix-create-playlist-button';
        const existing = document.getElementById(id);

        if (!isPlaylistPage()) {
            existing?.remove();
            return;
        }
        if (existing) return;

        const button = document.createElement('button');
        button.id = id;
        button.type = 'button';
        button.textContent = CONFIG.createButtonText;
        button.title = 'Создать новый плейлист';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            createPlaylist();
        });
        document.body.appendChild(button);
    }

    function updateUI() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            updatePageClass();
            cleanPlaylistMetadata();
            styleViewPlaylistLinks();
            hideDeleteItems();
            addDeleteButton();
            addCreateButton();
        });
    }

    function start() {
        injectStyles();
        updateUI();

        new MutationObserver(updateUI).observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(updateUI, 250);
            setTimeout(updateUI, 800);
        });
        window.addEventListener('popstate', () => setTimeout(updateUI, 300));

        console.info('[Fenix YT UI Playlist 1.3.0] loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();