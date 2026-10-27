; Remove only MultiDiscord's per-user startup entries on uninstall.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "fr.multidiscord.desktop"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "fr.multidiscord.desktop"
  ${endIf}
!macroend
