import Database from '../helper/database.js';
import Group from '../database/models/Group.js';
import { logger } from './logger.js';

export class GroupDiagnostics {
    static async logDatabaseConsistency(groupId) {
        try {
            logger.info('=== GROUP DATABASE CONSISTENCY CHECK ===');
            logger.info(`Group ID: ${groupId}`);
            
            // Get data from both database implementations
            const oldGroupData = await Database.getGroup(groupId);
            const newGroupData = await Group.getSettings(groupId);
            
            logger.info('Old Database Structure:');
            logger.info(JSON.stringify(oldGroupData, null, 2));
            
            logger.info('New Database Structure:');
            logger.info(JSON.stringify(newGroupData, null, 2));
            
            // Check for inconsistencies
            const inconsistencies = [];
            
            // Check welcome/leave settings
            if (oldGroupData.welcome !== newGroupData.welcome) {
                inconsistencies.push(`Welcome setting mismatch: old=${oldGroupData.welcome}, new=${newGroupData.welcome}`);
            }
            
            if (oldGroupData.leave !== (newGroupData.goodbye || false)) {
                inconsistencies.push(`Leave/Goodbye setting mismatch: old=${oldGroupData.leave}, new=${newGroupData.goodbye}`);
            }
            
            // Check anti-spam settings
            if (oldGroupData.antiSpam !== newGroupData.antiSpam) {
                inconsistencies.push(`Anti-spam setting mismatch: old=${oldGroupData.antiSpam}, new=${newGroupData.antiSpam}`);
            }
            
            // Check anti-link settings
            if (oldGroupData.antiLink !== newGroupData.antiLink) {
                inconsistencies.push(`Anti-link setting mismatch: old=${oldGroupData.antiLink}, new=${newGroupData.antiLink}`);
            }
            
            // Check anti-toxic settings
            if (oldGroupData.antiToxic !== newGroupData.antiToxic) {
                inconsistencies.push(`Anti-toxic setting mismatch: old=${oldGroupData.antiToxic}, new=${newGroupData.antiToxic}`);
            }
            
            if (inconsistencies.length > 0) {
                logger.error('DATABASE INCONSISTENCIES FOUND:');
                inconsistencies.forEach(issue => logger.error(`  - ${issue}`));
            } else {
                logger.info('✅ Database structures are consistent');
            }
            
            logger.info('=== END CONSISTENCY CHECK ===');
            
            return {
                oldData: oldGroupData,
                newData: newGroupData,
                inconsistencies
            };
            
        } catch (error) {
            logger.error('Error in database consistency check:', error);
            return null;
        }
    }
    
    static async logMemberTracking(groupId) {
        try {
            logger.info('=== MEMBER TRACKING DIAGNOSTICS ===');
            logger.info(`Group ID: ${groupId}`);
            
            const settings = await Group.getSettings(groupId);
            
            logger.info(`Total members in database: ${settings.members?.length || 0}`);
            logger.info(`Total banned members: ${settings.bannedMembers?.length || 0}`);
            logger.info(`Total warned members: ${Object.keys(settings.warnedMembers || {}).length}`);
            
            // Check member data structure
            if (settings.members && settings.members.length > 0) {
                logger.info('Sample member structure:');
                logger.info(JSON.stringify(settings.members[0], null, 2));
            }
            
            // Check banned members structure
            if (settings.bannedMembers && settings.bannedMembers.length > 0) {
                logger.info('Sample banned member structure:');
                logger.info(JSON.stringify(settings.bannedMembers[0], null, 2));
            }
            
            // Check warned members structure
            const warnedKeys = Object.keys(settings.warnedMembers || {});
            if (warnedKeys.length > 0) {
                logger.info('Sample warned member structure:');
                logger.info(JSON.stringify(settings.warnedMembers[warnedKeys[0]], null, 2));
            }
            
            logger.info('=== END MEMBER TRACKING DIAGNOSTICS ===');
            
            return settings;
            
        } catch (error) {
            logger.error('Error in member tracking diagnostics:', error);
            return null;
        }
    }
    
    static async logGroupSettingsPersistence(groupId) {
        try {
            logger.info('=== GROUP SETTINGS PERSISTENCE DIAGNOSTICS ===');
            logger.info(`Group ID: ${groupId}`);
            
            // Test setting update
            const originalSettings = await Group.getSettings(groupId);
            const testValue = !originalSettings.welcome;
            
            logger.info(`Testing welcome setting update: ${originalSettings.welcome} -> ${testValue}`);
            
            await Group.setWelcome(groupId, testValue, 'Test message');
            
            const updatedSettings = await Group.getSettings(groupId);
            
            if (updatedSettings.welcome === testValue) {
                logger.info('✅ Settings persistence test PASSED');
            } else {
                logger.error('❌ Settings persistence test FAILED');
                logger.error(`Expected: ${testValue}, Got: ${updatedSettings.welcome}`);
            }
            
            // Restore original setting
            await Group.setWelcome(groupId, originalSettings.welcome, originalSettings.welcomeMessage);
            
            logger.info('=== END SETTINGS PERSISTENCE DIAGNOSTICS ===');
            
            return {
                original: originalSettings,
                updated: updatedSettings,
                testPassed: updatedSettings.welcome === testValue
            };
            
        } catch (error) {
            logger.error('Error in settings persistence diagnostics:', error);
            return null;
        }
    }
    
    static async logDatabaseQueryPerformance() {
        try {
            logger.info('=== DATABASE QUERY PERFORMANCE DIAGNOSTICS ===');
            
            // Test multiple operations
            const iterations = 10;
            const testGroupId = 'test-group-' + Date.now();
            
            // Test Group model performance
            const groupStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await Group.getSettings(testGroupId);
            }
            const groupEnd = Date.now();
            
            // Test Database helper performance
            const dbStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await Database.getGroup(testGroupId);
            }
            const dbEnd = Date.now();
            
            const groupAvgTime = (groupEnd - groupStart) / iterations;
            const dbAvgTime = (dbEnd - dbStart) / iterations;
            
            logger.info(`Group model average time: ${groupAvgTime}ms`);
            logger.info(`Database helper average time: ${dbAvgTime}ms`);
            
            if (groupAvgTime > dbAvgTime * 2) {
                logger.warn('⚠️ Group model is significantly slower than Database helper');
            } else {
                logger.info('✅ Query performance is acceptable');
            }
            
            logger.info('=== END QUERY PERFORMANCE DIAGNOSTICS ===');
            
            return {
                groupAvgTime,
                dbAvgTime,
                performanceRatio: groupAvgTime / dbAvgTime
            };
            
        } catch (error) {
            logger.error('Error in query performance diagnostics:', error);
            return null;
        }
    }
    
    static async runAllDiagnostics(groupId) {
        logger.info('🔍 STARTING COMPREHENSIVE GROUP DIAGNOSTICS');
        
        const results = {
            consistency: await this.logDatabaseConsistency(groupId),
            memberTracking: await this.logMemberTracking(groupId),
            settingsPersistence: await this.logGroupSettingsPersistence(groupId),
            queryPerformance: await this.logDatabaseQueryPerformance()
        };
        
        logger.info('🔍 COMPREHENSIVE GROUP DIAGNOSTICS COMPLETED');
        
        return results;
    }
}

export default GroupDiagnostics;