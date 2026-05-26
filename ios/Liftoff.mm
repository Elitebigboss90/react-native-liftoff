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

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeLiftoffSpecJSI>(params);
}

+ (NSString *)moduleName { return @"Liftoff"; }

#else
RCT_EXPORT_MODULE(Liftoff)

RCT_EXPORT_METHOD(mark:(NSString *)name) {
    [LiftoffCollector mark:name];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getCheckpoints) {
    return [LiftoffCollector checkpoints];
}

RCT_EXPORT_METHOD(clear) {
    [LiftoffCollector clear];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAnchor) {
    return @{
        @"monotonicMs": @([LiftoffCollector anchorMonotonicMs]),
        @"wallMs":      @([LiftoffCollector anchorWallMs]),
    };
}
#endif

@end
