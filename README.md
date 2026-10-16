# Fenix YT UI Playlist

A lightweight Tampermonkey userscript that improves the **YouTube Playlists** page UI without replacing YouTube itself.

Небольшой userscript для Tampermonkey, который улучшает **интерфейс страницы плейлистов YouTube**, не заменяя сам YouTube и не создавая отдельный менеджер плейлистов.

---

## Русский

### Что делает скрипт

**Fenix YT UI Playlist** изменяет интерфейс страницы плейлистов YouTube и добавляет несколько удобных действий.

В текущей версии включено:

- отображение **5 плейлистов в одном ряду** на широком экране;
- очистка карточек плейлистов от лишней служебной информации:
  - удаляется `Обновлено сегодня`, `Обновлено вчера`, `Обновлено ...`;
  - удаляется подпись `· Плейлист`;
- ссылка **«Посмотреть весь плейлист»** оформляется как компактная кнопка с одним серым бордюром;
- пункт **«Удалить»** скрывается из быстрого меню `⋮`, чтобы снизить риск случайного удаления;
- кнопка **«Удалить плейлист»** переносится в окно **«Редактирование»**;
- перед удалением добавляется дополнительное подтверждение, после чего используется штатное подтверждение YouTube;
- добавляется плавающая кнопка **`＋ Новый плейлист`**;
- новый плейлист создаётся с приватностью `PRIVATE` / «Ограниченный доступ»;
- поддерживаются SPA-переходы YouTube без полной перезагрузки страницы;
- добавлены селекторы для нескольких старых и новых вариантов DOM YouTube.

### Что скрипт НЕ делает

Скрипт не является отдельным менеджером коллекции YouTube и не заменяет штатную систему плейлистов. Он в первую очередь меняет UI страницы и делает штатные действия безопаснее и удобнее.

Создание плейлиста использует внутренний механизм `youtubei` текущей страницы YouTube. Из-за этого функция может потребовать адаптации, если YouTube изменит внутренний API или DOM.

### Установка

1. Установите Tampermonkey или совместимый userscript-менеджер.
2. Откройте файл `fenix-yt-organizer-playlist.user.js` в репозитории.
3. Скопируйте код в новый userscript Tampermonkey и сохраните его.
4. Откройте `https://www.youtube.com/feed/playlists`.
5. Обновите страницу.

### Основные настройки

В начале скрипта находится объект `CONFIG`:

```js
const CONFIG = {
    createButtonText: '＋ Новый плейлист',
    deleteButtonText: '🗑 Удалить плейлист',
    newPlaylistPrivacy: 'PRIVATE',
    confirmDelete: true,
    playlistsPerRow: 5
};
```

Через него можно изменить количество карточек в ряду, подписи кнопок, приватность создаваемого плейлиста и дополнительное подтверждение удаления.

---

## English

### What the script does

**Fenix YT UI Playlist** improves the YouTube Playlists page UI and adds a few convenience and safety features.

Current features:

- shows **5 playlists per row** on wide screens;
- removes unnecessary playlist-card metadata:
  - hides `Updated today`, `Updated yesterday`, `Updated ...`;
  - removes the `· Playlist` label;
- turns **“View full playlist”** into a compact button with a single gray border;
- hides **Delete** from the quick `⋮` menu to reduce accidental deletion;
- moves **Delete playlist** into the **Edit** dialog;
- adds an extra confirmation step before invoking YouTube's native delete confirmation;
- adds a floating **`＋ New playlist`** button;
- newly created playlists default to `PRIVATE` visibility;
- supports YouTube SPA navigation without requiring a full page reload;
- includes selectors for multiple old and newer YouTube DOM variants.

### What it does NOT do

This is not a separate YouTube playlist-management application. It mainly customizes the existing YouTube playlist UI and makes common actions safer and more convenient.

Playlist creation uses YouTube's internal `youtubei` page mechanism rather than the public YouTube Data API. Because of this, that feature may require updates when YouTube changes its internal API or DOM structure.

### Installation

1. Install Tampermonkey or another compatible userscript manager.
2. Open `fenix-yt-organizer-playlist.user.js` from this repository.
3. Copy it into a new Tampermonkey userscript and save it.
4. Open `https://www.youtube.com/feed/playlists`.
5. Reload the page.

### Main configuration

The script exposes a small `CONFIG` object near the top:

```js
const CONFIG = {
    createButtonText: '＋ Новый плейлист',
    deleteButtonText: '🗑 Удалить плейлист',
    newPlaylistPrivacy: 'PRIVATE',
    confirmDelete: true,
    playlistsPerRow: 5
};
```

You can use it to change the number of cards per row, button labels, default playlist privacy, and the extra delete confirmation.

---

## Compatibility

Tested primarily with desktop YouTube in Chromium/Firefox-family browsers through Tampermonkey. YouTube frequently changes its internal markup, so future UI updates may require selector adjustments.
