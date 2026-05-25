#import "Liftoff.h"
#import "LiftoffCollector.h"

#if DEBUG
#import <React/RCTDevMenu.h>
#endif

@implementation Liftoff

- (NSArray<NSString *> *)supportedEvents {
    return @[@"LiftoffShowReport"];
}

- (void)mark:(NSString *)name     { [LiftoffCollector mark:name]; }
- (NSArray *)getCheckpoints       { return [LiftoffCollector checkpoints]; }
- (void)clear                     { [LiftoffCollector clear]; }

- (NSDictionary *)getAnchor {
    return @{
        @"monotonicMs": @([LiftoffCollector anchorMonotonicMs]),
        @"wallMs":      @([LiftoffCollector anchorWallMs]),
    };
}

#if DEBUG
- (void)setBridge:(RCTBridge *)bridge {
    [super setBridge:bridge];
    RCTDevMenu *devMenu = [bridge moduleForClass:[RCTDevMenu class]];
    if (!devMenu) return;
    RCTDevMenuItem *item = [RCTDevMenuItem buttonItemWithTitle:@"Show Liftoff Report"
                                                      handler:^{
        [self sendEventWithName:@"LiftoffShowReport" body:nil];
    }];
    [devMenu addItem:item];
}
#endif

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeLiftoffSpecJSI>(params);
}

+ (NSString *)moduleName { return @"Liftoff"; }

@end
