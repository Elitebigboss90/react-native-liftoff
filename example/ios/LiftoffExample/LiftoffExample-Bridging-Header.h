// Allows AppDelegate.swift to call LiftoffCollector.
// Relative path is used because the podspec marks all headers as private_header_files,
// which means <Liftoff/LiftoffCollector.h> does not resolve for consuming targets.
// Path: example/ios/LiftoffExample/ -> ../../../ -> repo root -> ios/LiftoffCollector.h
#import "../../../ios/LiftoffCollector.h"
