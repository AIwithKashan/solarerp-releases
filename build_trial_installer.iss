; Inno Setup Script for SolarERP Trial & Production Installer
; Generated & Maintained by AIwithKashan (03341911680)

#define MyAppName "SolarERP"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "AIwithKashan"
#define MyAppContact "03341911680"
#define MyAppExeName "SolarERP.exe"
#define SourceAppDir "E:\Solar Shop Mangement Software\SolarERP\dist\win-unpacked"

[Setup]
AppId={{C8E110A5-8F32-4C11-B64E-91B18545A170}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\SolarERP
DisableProgramGroupPage=yes
OutputBaseFilename=SolarERP-Setup
OutputDir=E:\Solar Shop Mangement Software\SolarERP\dist
SetupIconFile=E:\Solar Shop Mangement Software\SolarERP\app_icon.ico
Compression=lzma2/fast
SolidCompression=no
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; EXCLUDE dev.db, backup-config
Source: "{#SourceAppDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.git*,SolarKeyGen.html,\resources\app\server\backup-config.json,\resources\app\server\dev.db,unins000.*"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DataDirPage: TInputDirWizardPage;

procedure InitializeWizard;
var
  DefaultDataDir: string;
begin
  if DirExists('D:\') then
    DefaultDataDir := 'D:\SolarERP_Data'
  else
    DefaultDataDir := ExpandConstant('{userdocs}\SolarERP_Data');

  DataDirPage := CreateInputDirPage(wpSelectDir,
    'Select Database Storage Location',
    'Where should SolarERP store your shop database (dev.db) and backup files?',
    'Select the folder where your database and local backup files will be stored, then click Next.',
    False, '');
  DataDirPage.Add('');
  DataDirPage.Values[0] := DefaultDataDir;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ChosenDir: string;
begin
  if CurStep = ssPostInstall then
  begin
    ChosenDir := DataDirPage.Values[0];
    if ChosenDir = '' then
      ChosenDir := ExpandConstant('{userdocs}\SolarERP_Data');
    
    // Save chosen database location to Registry for SolarERP
    RegWriteStringValue(HKCU, 'Software\SolarERP', 'DatabasePath', ChosenDir);
  end;
end;
