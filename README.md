# MultiDiscord

English | [Français](README.fr.md)

All your Discord accounts in one window, with a separate tab and session for each account.

**[Download for Windows](https://github.com/v-ntv/MultiDiscord/releases/latest/download/MultiDiscord-Setup.exe)** · [All releases](https://github.com/v-ntv/MultiDiscord/releases)

## Installation

1. Download `MultiDiscord-Setup.exe` from a release in this repository.
2. Open the installer and follow the steps.
3. Launch MultiDiscord and sign in on Discord’s official login page.
4. Click **+** to add another account.

Requires 64-bit Windows. No Node.js, terminal or API key is needed. The download link becomes available after the first release is published. Current installers are not digitally signed, so Windows may display an unknown-publisher or SmartScreen warning.

## Accounts and tabs

Every tab has its own persistent session. You can use several accounts at once without signing out, and your accounts and tabs are restored after restarting the application.

- Your Discord display name and avatar appear on the tab after sign-in. Before sign-in, double-click the temporary label to rename it.
- Click a tab to switch accounts.
- Click **×** to close a tab. Reopen it from **Accounts → Reopen an account**; its session is kept.
- Click **↻** to reload the active account.
- Click **♫** to mute or unmute the active account.

Closed tabs do not receive messages or notifications until reopened. To sign out of an account, use Discord’s own sign-out command.

### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Add an account | `Ctrl+T` |
| Next / previous account | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Select one of the first nine tabs | `Ctrl+1` to `Ctrl+9` |
| Close the active tab | `Ctrl+W` |
| Reload the active tab | `Ctrl+R` |

## Settings

Click **⚙** in the top toolbar. The application uses English by default; select **Language → Français** to switch to French.

- **Language → Français / English** changes the interface immediately without signing out. Discord’s language is configured separately in Discord.
- **Start with Windows** opens MultiDiscord when you sign in to Windows. Off by default; available in the installed application.
- **Minimize instead of closing with the close button** keeps accounts running and minimizes the window to the taskbar. When disabled, closing the window asks for confirmation. Canceling keeps accounts and calls open.
- **Automatic updates** checks for new releases at startup and periodically, then downloads them in the background. When an update is ready, restart when convenient or quit normally to install it. You can disable automatic updates and use **Check for updates** instead.
- **Quit MultiDiscord** exits the application even when minimizing on close is enabled.

MultiDiscord must remain open to receive notifications. It does not continue running in the Windows notification area after exiting.

## Notifications

Each tab displays Discord’s notification count. Their total also appears as a red Windows taskbar badge, showing `99+` above 99. The badge clears when Discord resets its counts.

These counts come from Discord and depend on its settings; they do not necessarily represent every unread message.

If notifications are missing:

- Check notification settings in both Discord and Windows.
- Make sure taskbar badges are enabled in Windows settings.
- Keep the relevant tabs open. You can minimize the application window.

Muting a tab does not disable visual notifications.

## Vencord and BetterDiscord themes

Open **Accounts → Customize this tab**:

- **Vencord Web** downloads and enables the official web build for the selected account. Uncheck it to disable it.
- **Update Vencord Web** updates Vencord for accounts where it is enabled.
- **Import a CSS theme** lets you select a `.css` or `.theme.css` file, including BetterDiscord themes.
- **Remove CSS theme** removes the active account’s imported theme.

Vencord settings and themes are separate for each account. Enabling Vencord relaxes some protections against code injection only in the affected tabs; disabling it and reloading restores those protections. Use customizations you trust.

**Native BetterDiscord plugins are not supported.** BetterDiscord support covers CSS themes. Some Vencord plugins require the native Discord client and are unavailable here. For custom CSS, import a file; the separate QuickCSS editor window is not supported.

## Screen sharing

1. Join a voice channel or Discord call in the account you want to use.
2. Click Discord’s screen-sharing button.
3. In the MultiDiscord picker, select **Screens** or **Windows**, then choose a source.
4. Click **Share**, or cancel without starting a capture.

On Windows, **Share system audio** is available when Discord requests audio. It is off by default and may include sound from all applications, including the Discord call. Audio is not limited to the selected window.

Stop sharing using Discord’s sharing controls. Each new request requires a source selection. Closing or reloading the account tab stops its capture. Closed windows and protected content may not be capturable.

If Discord asks you to download its desktop application when you try to share, update MultiDiscord and restart it completely. Version 0.6 corrects the browser identification used by the account tabs.

## Sign-in and local data

Sign in directly on Discord’s official website within the application using your password or QR code. Passkey prompts are disabled; passkeys are not available in MultiDiscord.

Sessions and preferences are stored in the application data folder, usually `%APPDATA%/MultiDiscord` or `%APPDATA%/multidiscord`. This folder contains sign-in data: do not share it. Closing a tab does not delete its session.

The application does not require you to enter a Discord token or API key manually. Never post passwords, tokens or session files in issues or screenshots.

## Updates and limitations

- Automatic updates use public releases from this GitHub repository and require no API key. They are available in the installed Windows version. Versions 0.4.0 and earlier need one manual installation of a newer version to enable automatic updates.
- Microphone and camera access require permission. Screen sharing has its own source picker; system audio sharing is supported on Windows only.
- Native Discord features such as the game overlay and global shortcuts are not available.
- Discord interface changes may affect profile detection, notification counts or themes.

## Need help?

[Report an issue](https://github.com/v-ntv/MultiDiscord/issues) with your MultiDiscord version, Windows version and reproduction steps. Hide personal information in screenshots.

MultiDiscord is an independent project, not affiliated with Discord, Vencord or BetterDiscord.
