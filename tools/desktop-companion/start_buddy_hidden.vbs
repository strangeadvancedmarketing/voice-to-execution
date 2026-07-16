' Launches Claude Buddy (electron overlay) with NO console window.
' The electron GUI still appears; only the cmd/npx console is hidden.
' Self-locates to its own folder, so it runs from wherever you put the repo.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run "cmd /c npx electron .", 0, False
