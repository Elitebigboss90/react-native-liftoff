#import <Foundation/Foundation.h>

@interface LiftoffCollector : NSObject
+ (void)mark:(NSString *)name;
+ (NSArray *)checkpoints;
+ (void)clear;
+ (double)anchorMonotonicMs;
+ (double)anchorWallMs;
@end
