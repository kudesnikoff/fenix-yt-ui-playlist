// ==UserScript==
// @name         Fenix YT Organizer Playlist
// @namespace    fenix.youtube
// @version      1.2.0
// @description  Улучшенный интерфейс и безопасное управление плейлистами YouTube
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

    const PLAYLIST_CARD_SELECTORS = [
        'ytd-playlist-renderer',
        'ytd-grid-playlist-renderer',
        'yt-lockup-view-model',
        'ytd-rich-item-renderer',
        'yt-content-metadata-view-model',
        'yt-lockup-metadata-view-model'
    ].join(',');

    const MENU_ITEM_SELECTORS = [
        'ytd-menu-service-item-renderer',
        'tp-yt-paper-item',
        'yt-list-item-view-model'
    ].join(',');

    const DELETE_NAMES = ['Удалить', 'Delete'];

    let lastPlaylistCard = null;
    let updateScheduled = false;

    function txt(el) {
        return (el?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getPlaylistCards() {
        return [...document.querySelectorAll(PLAYLIST_CARD_SELECTORS)];
    }

    function getPlaylistCard(el) {
        return el?.closest?.(PLAYLIST_CARD_SELECTORS) || null;
    }

    function isDeleteItem(el) {
        const value = txt(el);
        return DELETE_NAMES.some(name => value === name || value.startsWith(name));
    }

    function isPlaylistPage() {
        const path = location.pathname;

        if (
            path.includes('/feed/playlists') ||
            path.includes('/playlists') ||
            path.includes('/feed/you')
        ) {
            if (!path.includes('/feed/you')) return true;
        }

        const headings = [...document.querySelectorAll('h1, h2, yt-formatted-string')];
        const hasPlaylistHeading = headings.some(el => {
            const value = txt(el);
            return value === 'Плейлисты' || value === 'Playlists';
        });

        if (hasPlaylistHeading) return true;

        const cards = getPlaylistCards();
        if (cards.length >= 2) {
            let playlistLikeCount = 0;
            for (const card of cards) {
                const value = txt(card);
                if (
                    value.includes('Плейлист') ||
                    value.includes('Playlist') ||
                    card.querySelector('a[href*="/playlist?list="]')
                ) {
                    playlistLikeCount++;
                }
            }
            return playlistLikeCount >= 2;
        }

        return false;
    }

    document.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const card = getPlaylistCard(target);
        if (card) lastPlaylistCard = card;
    }, true);

    function injectStyles() {
        if (document.getElementById('fenix-yt-organizer-playlist-styles')) return;

        const style = document.createElement('style');
        style.id = 'fenix-yt-organizer-playlist-styles';
        style.textContent = `
            body.fenix-playlists-page ytd-rich-grid-renderer {
                --ytd-rich-grid-items-per-row: ${CONFIG.playlistsPerRow} !important;
                --ytd-rich-grid-posts-per-row: ${CONFIG.playlistsPerRow} !important;
            }

            body.fenix-playlists-page #contents.ytd-rich-grid-renderer {
                --ytd-rich-grid-items-per-row: ${CONFIG.playlistsPerRow} !important;
            }

            @media (min-width: 1200px) {
                body.fenix-playlists-page ytd-rich-grid-row {
                    --ytd-rich-grid-items-per-row: ${CONFIG.playlistsPerRow} !important;
                }

                body.fenix-playlists-page ytd-rich-grid-row > #contents {
                    grid-template-columns: repeat(${CONFIG.playlistsPerRow}, minmax(0, 1fr)) !important;
                }
            }

            .fenix-view-playlist-button {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-sizing: border-box !important;
                min-height: 36px !important;
                margin-top: 8px !important;
                padding: 6px 12px !important;
                border: 1px solid rgba(255,255,255,.30) !important;
                border-radius: 18px !important;
                background: transparent !important;
                color: rgba(255,255,255,.88) !important;
                font-family: Roboto, Arial, sans-serif !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                line-height: 20px !important;
                text-align: center !important;
                text-decoration: none !important;
                cursor: pointer !important;
                transition: background .15s, border-color .15s !important;
            }

            .fenix-view-playlist-button:hover {
                background: rgba(255,255,255,.09) !important;
                border-color: rgba(255,255,255,.48) !important;
            }

            #fenix-delete-playlist-wrapper {
                margin: 18px 20px 20px 20px;
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
                font-family: Roboto, Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                text-align: center;
                cursor: pointer;
                transition: background .15s, border-color .15s;
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
                border: none;
                border-radius: 21px;
                background: #272727;
                color: #fff;
                font-family: Roboto, Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 16px rgba(0,0,0,.35);
                cursor: pointer;
                transition: background .15s, transform .15s;
            }

            #fenix-create-playlist-button:hover {
                background: #3a3a3a;
            }

            #fenix-create-playlist-button:active {
                transform: scale(.97);
            }
        `;

        document.head.appendChild(style);
    }

    function updatePageClass() {
        if (!document.body) return;
        document.body.classList.toggle('fenix-playlists-page', isPlaylistPage());
    }

    function cleanPlaylistMetadata() {
        if (!isPlaylistPage()) return;

        const cards = getPlaylistCards();
        for (const card of cards) {
            const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let node;
            while ((node = walker.nextNode())) nodes.push(node);

            for (const textNode of nodes) {
                const original = textNode.nodeValue;
                if (!original) continue;

                let value = original;
                value = value.replace(/\s*[·•|]\s*Плейлист\b/gi, '');
                value = value.replace(/\s*[·•|]\s*Playlist\b/gi, '');
                value = value.replace(/^\s*Плейлист\s*$/gi, '');
                value = value.replace(/^\s*Playlist\s*$/gi, '');
                value = value.replace(/^\s*Обновлено\b.*$/giu, '');
                value = value.replace(/^\s*Updated\b.*$/giu, '');
                value = value.replace(/\s{2,}/g, ' ').replace(/\s*[·•|]\s*$/g, '').trim();

                if (value === original) continue;
                textNode.nodeValue = value;

                if (!value) {
                    const parent = textNode.parentElement;
                    if (parent && !txt(parent)) parent.style.display = 'none';
                }
            }
        }
    }

    function styleViewPlaylistLinks() {
        if (!isPlaylistPage()) return;

        const cards = getPlaylistCards();
        for (const card of cards) {
            const elements = card.querySelectorAll('a, button, yt-formatted-string, span');
            for (const el of elements) {
                const value = txt(el);
                const isViewLink = value === 'Посмотреть весь плейлист' || value === 'View full playlist';
                if (!isViewLink) continue;

                const target = el.closest('a, button') || el;
                target.classList.add('fenix-view-playlist-button');
            }
        }
    }

    function hideDeleteItems() {
        const items = document.querySelectorAll(MENU_ITEM_SELECTORS);
        for (const item of items) {
            if (!isDeleteItem(item)) continue;

            const insideMenu = item.closest('ytd-menu-popup-renderer, tp-yt-paper-listbox, [role="menu"]');
            if (!insideMenu) continue;

            item.style.display = 'none';
            item.dataset.fenixHiddenDelete = '1';
        }
    }

    function findEditDialog() {
        const dialogs = [...document.querySelectorAll('tp-yt-paper-dialog, [role="dialog"], dialog')];
        return dialogs.find(dialog => {
            const value = txt(dialog);
            return value.includes('Редактирование') || value.includes('Edit');
        }) || null;
    }

    function findPlaylistMenuButton(card) {
        if (!card) return null;

        return (
            card.querySelector('ytd-menu-renderer yt-icon-button') ||
            card.querySelector('button[aria-label*="меню" i]') ||
            card.querySelector('button[aria-label*="действ" i]') ||
            card.querySelector('button[aria-label*="menu" i]') ||
            card.querySelector('yt-icon-button')
        );
    }

    function closeEditDialog(dialog) {
        if (!dialog) return;

        const closeButton =
            dialog.querySelector('button[aria-label*="Закрыть" i]') ||
            dialog.querySelector('button[aria-label*="Close" i]');

        if (closeButton) {
            closeButton.click();
            return;
        }

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            bubbles: true
        }));
    }

    async function runNativeDelete(dialog) {
        if (!lastPlaylistCard) {
            alert('Не удалось определить плейлист.\n\nЗакрой окно и снова открой его через:\n⋮ → Изменить');
            return;
        }

        if (CONFIG.confirmDelete) {
            const titleElement = lastPlaylistCard.querySelector(
                '#video-title, #title, a[href*="/playlist?list="]'
            );

            const name = txt(titleElement) || 'этот плейлист';
            const confirmed = confirm(
                `Удалить "${name}"?\n\nПосле этого YouTube ещё покажет своё штатное подтверждение.`
            );

            if (!confirmed) return;
        }

        const menuButton = findPlaylistMenuButton(lastPlaylistCard);
        if (!menuButton) {
            alert('Не удалось найти штатную кнопку меню плейлиста.');
            return;
        }

        closeEditDialog(dialog);
        await sleep(350);
        menuButton.click();
        await sleep(350);

        const items = [...document.querySelectorAll(MENU_ITEM_SELECTORS)];
        const deleteItem = items.find(isDeleteItem);

        if (!deleteItem) {
            alert('YouTube не показал штатный пункт "Удалить".');
            return;
        }

        deleteItem.style.display = '';
        deleteItem.click();
    }

    function addDeleteButton() {
        const dialog = findEditDialog();
        if (!dialog) return;

        if (dialog.querySelector('#fenix-delete-playlist-button')) return;

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
        const title = prompt('Название нового плейлиста:');
        if (!title) return;

        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        const app = document.querySelector('ytd-app');
        if (!app) {
            alert('Не удалось найти ytd-app.');
            return;
        }

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
                                title: cleanTitle,
                                privacyStatus: CONFIG.newPlaylistPrivacy
                            }
                        }
                    ],
                    optionalAction: false
                }
            }));

            for (let i = 0; i < 10 && returnValue.length === 0; i++) {
                await sleep(100);
            }

            if (returnValue.length === 0) {
                throw new Error('YouTube did not return yt-service-request result.');
            }

            const response = returnValue.at(-1);
            if (response?.ajaxPromise) await response.ajaxPromise;

            const reload = confirm(
                `Плейлист "${cleanTitle}" создан.\n\nОбновить страницу, чтобы увидеть его?`
            );

            if (reload) location.reload();
        } catch (error) {
            console.error('[Fenix YT Organizer Playlist]', error);
            alert(
                'Не удалось создать плейлист.\n\nYouTube мог изменить внутренний API.\nОткрой F12 → Console.'
            );
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
        if (updateScheduled) return;
        updateScheduled = true;

        requestAnimationFrame(() => {
            updateScheduled = false;
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

        const observer = new MutationObserver(updateUI);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(updateUI, 250);
            setTimeout(updateUI, 800);
        });

        window.addEventListener('popstate', () => {
            setTimeout(updateUI, 300);
        });

        console.info('[Fenix YT Organizer Playlist 1.2.0] loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
