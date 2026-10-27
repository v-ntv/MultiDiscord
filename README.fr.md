# MultiDiscord

[English](README.md) | Français

Tous vos comptes Discord dans une seule fenêtre, avec un onglet par compte.

**[Télécharger pour Windows](https://github.com/v-ntv/MultiDiscord/releases/latest/download/MultiDiscord-Setup.exe)** · [Voir les versions disponibles](https://github.com/v-ntv/MultiDiscord/releases)

## Installation

1. Téléchargez `MultiDiscord-Setup.exe` depuis une release de ce dépôt.
2. Ouvrez l’installateur et suivez les étapes.
3. Lancez MultiDiscord et connectez-vous sur la page officielle de Discord.
4. Cliquez sur **+** pour ajouter un autre compte.

Compatible avec Windows 64 bits. Aucun Node.js, terminal ou clé API n’est nécessaire. Si aucune release n’est encore publiée, l’installateur n’est pas encore disponible au téléchargement. La version actuelle n’est pas signée numériquement et Windows peut afficher un avertissement concernant l’éditeur.

## Vos comptes et onglets

Chaque onglet possède sa propre session : vous pouvez utiliser plusieurs comptes en même temps sans les déconnecter. Vos sessions et onglets sont conservés après redémarrage.

- Le nom et la photo du compte apparaissent automatiquement sur son onglet après connexion. Avant connexion, un double-clic permet de renommer le libellé provisoire.
- Cliquez sur un onglet pour passer à ce compte.
- Cliquez sur **×** pour fermer un onglet. Vous pouvez le rouvrir depuis **Comptes → Rouvrir un compte** ; sa session est conservée.
- Cliquez sur **↻** pour recharger le compte actif.
- Cliquez sur **♫** pour couper ou réactiver le son du compte actif.

Un onglet fermé ne reçoit plus de messages ni de notifications jusqu’à sa réouverture. Pour déconnecter réellement un compte, utilisez la déconnexion dans Discord.

### Raccourcis

| Action | Raccourci |
| --- | --- |
| Ajouter un compte | `Ctrl+T` |
| Compte suivant / précédent | `Ctrl+Tab` / `Ctrl+Maj+Tab` |
| Accéder aux neuf premiers onglets | `Ctrl+1` à `Ctrl+9` |
| Fermer l’onglet actif | `Ctrl+W` |
| Recharger l’onglet actif | `Ctrl+R` |

## Paramètres

Cliquez sur **⚙** dans la barre supérieure.

- **Démarrer avec Windows** : ouvre MultiDiscord à l’ouverture de votre session Windows. Cette option est désactivée par défaut et disponible dans la version installée.
- **Langue → Français / English** : change immédiatement la langue de MultiDiscord, sans déconnecter les comptes. La langue de Discord se règle séparément dans Discord.
- **Réduire au lieu de fermer avec la croix** : conserve les comptes actifs et réduit la fenêtre dans la barre des tâches lorsque vous cliquez sur la croix. Lorsque cette option est désactivée, une confirmation est demandée avant de fermer l’application. Annuler conserve les appels et les comptes ouverts.
- **Mises à jour automatiques** : vérifie les nouvelles versions au démarrage et régulièrement, puis les télécharge en arrière-plan. Une mise à jour prête peut être installée en redémarrant à votre demande ou en quittant normalement l’application. Vous pouvez désactiver cette option et utiliser **Rechercher les mises à jour**.
- **Quitter MultiDiscord** : ferme complètement l’application, même lorsque la réduction par la croix est activée.

MultiDiscord doit rester ouvert pour recevoir des notifications. Il ne fonctionne pas dans la zone de notification Windows après sa fermeture.

## Notifications

Les compteurs de notifications apparaissent sur chaque onglet. Leur total s’affiche aussi sur l’icône de l’application dans la barre des tâches Windows, avec `99+` au-delà de 99. Le badge disparaît lorsque Discord remet les compteurs à zéro.

Ces compteurs proviennent de Discord et dépendent de ses réglages : ils ne représentent pas forcément tous les messages non lus.

Si les notifications ne s’affichent pas :

- Vérifiez les réglages de notifications du compte dans Discord et ceux de Windows.
- Vérifiez que les badges sont activés dans les paramètres de la barre des tâches Windows.
- Gardez les onglets concernés ouverts ; vous pouvez réduire la fenêtre.

Couper le son d’un onglet ne désactive pas les notifications visuelles.

## Vencord et thèmes BetterDiscord

Dans **Comptes → Personnaliser cet onglet** :

- **Vencord Web** télécharge et active la version web officielle de Vencord pour ce compte. Décochez l’option pour le désactiver.
- **Mettre à jour Vencord Web** actualise Vencord pour les comptes où il est activé.
- **Importer un thème CSS** permet de choisir un fichier `.css` ou `.theme.css`, notamment un thème BetterDiscord.
- **Retirer le thème CSS** désactive le thème du compte actif.

Les réglages Vencord et les thèmes sont propres à chaque compte. L’activation de Vencord réduit certaines protections contre l’injection de code uniquement dans les onglets concernés ; leur désactivation puis rechargement rétablit ces protections. Activez uniquement des personnalisations de confiance.

**Les plugins natifs BetterDiscord ne sont pas compatibles.** Le support BetterDiscord concerne ses thèmes CSS. Certains plugins Vencord réservés au client natif ne sont pas disponibles. Pour le CSS personnalisé, utilisez l’import de fichier ; l’éditeur QuickCSS en fenêtre séparée n’est pas pris en charge.

## Partage d’écran

1. Rejoignez un salon vocal ou un appel Discord dans le compte souhaité.
2. Cliquez sur le bouton de partage d’écran dans Discord.
3. Dans la fenêtre MultiDiscord, choisissez **Écrans** ou **Fenêtres**, puis sélectionnez la source à diffuser.
4. Cliquez sur **Partager**. Vous pouvez annuler sans démarrer la capture.

Sous Windows, l’option **Partager le son du système** est proposée si Discord demande un partage avec audio. Elle est désactivée par défaut et peut inclure le son de toutes les applications, y compris l’appel Discord ; ce n’est pas une capture audio limitée à la fenêtre choisie.

Arrêtez la diffusion depuis les commandes de partage de Discord. Il faut sélectionner une source à chaque nouvelle demande. Fermer ou recharger l’onglet met fin à sa capture. Une fenêtre fermée ou certains contenus protégés peuvent ne pas être capturables.

Si Discord demande de télécharger son application de bureau lorsque vous lancez le partage, mettez MultiDiscord à jour puis quittez et relancez complètement l’application. La version 0.6 corrige l’identification du navigateur utilisée par les onglets.

## Connexion et données locales

Connectez-vous directement sur le site officiel de Discord affiché dans l’application, par mot de passe ou code QR. Les fenêtres de clé d’accès sont désactivées ; les passkeys ne sont pas disponibles dans MultiDiscord.

Les sessions et préférences sont conservées dans le dossier de données de l’application, habituellement `%APPDATA%/MultiDiscord` ou `%APPDATA%/multidiscord`. Ce dossier contient des données de connexion : ne le partagez pas. Fermer un onglet ne supprime pas sa session.

L’application n’a besoin d’aucun jeton Discord ni clé API à saisir manuellement. Ne communiquez jamais vos mots de passe, jetons ou fichiers de session dans un ticket ou une capture d’écran.

## Limites et mises à jour

- Le microphone et la caméra demandent votre autorisation. Le partage d’écran dispose d’un sélecteur de source ; le son système est pris en charge uniquement sous Windows.
- Les fonctions propres au client Discord natif, comme l’overlay de jeu et les raccourcis globaux, ne sont pas disponibles.
- Une modification de l’interface Discord peut affecter la détection du profil, les compteurs ou les thèmes.
- Les mises à jour automatiques utilisent les releases publiques de ce dépôt GitHub, sans clé API. Elles sont disponibles dans la version Windows installée. Les versions 0.4.0 et antérieures nécessitent d’installer une première fois la nouvelle version manuellement pour bénéficier de ce mécanisme.

## Besoin d’aide ?

[Signalez un problème](https://github.com/v-ntv/MultiDiscord/issues) en précisant votre version de MultiDiscord, votre version de Windows et les étapes permettant de reproduire le problème. Masquez toute information personnelle dans vos captures.

MultiDiscord est un projet indépendant, non affilié à Discord, Vencord ou BetterDiscord.
