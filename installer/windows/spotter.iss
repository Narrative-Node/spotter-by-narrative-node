; Spotter by Narrative Node: Windows installer (Inno Setup 6).
; Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
;
; Built by installer/build.mjs, which passes Version, Source (the signed
; extension) and OutDir, and SIGN plus a "signtool" definition when the
; installer itself is to be code-signed.
;
; It copies the extension into the user's own CEP extensions folder: no admin
; prompt, nothing else on the machine changes.

#define AppName "Spotter by Narrative Node"
#define ExtensionId "com.narrativenode.spotter"

[Setup]
; Never change AppId: it is how Windows knows an update is the same program.
AppId={{6D3B2F0E-8A61-4C3B-9F7E-2B5A1C9E4D17}
AppName={#AppName}
AppVersion={#Version}
AppVerName={#AppName} {#Version}
AppPublisher=Narrative Node
AppPublisherURL=https://www.narrativenode.app
VersionInfoVersion={#Version}
VersionInfoCompany=Narrative Node
VersionInfoDescription={#AppName} Setup
PrivilegesRequired=lowest
DefaultDirName={userappdata}\Adobe\CEP\extensions\{#ExtensionId}
DisableDirPage=yes
DisableProgramGroupPage=yes
; The uninstaller lives outside the extension: an extra file inside a signed
; extension breaks its signature, and Premiere would refuse to load it.
UninstallFilesDir={userappdata}\Narrative Node\Spotter
UninstallDisplayName={#AppName}
UninstallDisplayIcon={uninstallexe}
OutputDir={#OutDir}
OutputBaseFilename=Spotter-Setup-{#Version}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern dark
WizardImageFile=art\side-100.bmp,art\side-125.bmp,art\side-150.bmp,art\side-175.bmp,art\side-200.bmp,art\side-225.bmp,art\side-250.bmp
WizardSmallImageFile=art\head-100.png,art\head-125.png,art\head-150.png,art\head-175.png,art\head-200.png,art\head-225.png,art\head-250.png
SetupIconFile=art\spotter.ico
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
#ifdef SIGN
SignTool=signtool
SignedUninstaller=yes
#endif

[Messages]
WelcomeLabel1=Spotter by Narrative Node
WelcomeLabel2=Browse your music and sound-effect folders inside Premiere Pro, hear each sound, and send it to your project.%n%nSetup copies the Spotter panel into Premiere Pro's extensions folder. Close Premiere Pro before you continue.
ReadyLabel1=Ready to install Spotter.
ReadyLabel2a=Click Install to add the Spotter panel to Premiere Pro.
FinishedHeadingLabel=Spotter is ready
FinishedLabelNoIcons=Open Premiere Pro, then choose Window > Extensions > Spotter by Narrative Node.
FinishedLabel=Open Premiere Pro, then choose Window > Extensions > Spotter by Narrative Node.

[InstallDelete]
; An older version's files go first, so nothing stale sits beside the new signature.
Type: filesandordirs; Name: "{app}"

[Files]
Source: "{#Source}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
