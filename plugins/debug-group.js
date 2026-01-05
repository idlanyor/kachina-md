import GroupDiagnostics from '../helper/groupDiagnostics.js';

export const handler = {
    command: ['debuggroup', 'dg'],
    help: 'Run comprehensive group database diagnostics',
    category: 'owner',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: true,
    isGroup: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ *Group Only*\nThis command can only be used in groups.')
            }

            const groupId = m.chat
            
            await m.reply('🔍 *Starting Group Diagnostics*\n\nPlease wait while I analyze the group database...')
            
            // Run all diagnostics
            const results = await GroupDiagnostics.runAllDiagnostics(groupId)
            
            // Prepare summary message
            let summaryMsg = `📊 *Group Diagnostics Report*\n\n`
            
            // Consistency check results
            if (results.consistency) {
                summaryMsg += `🔍 *Database Consistency:*\n`
                summaryMsg += `├─ Inconsistencies found: ${results.consistency.inconsistencies.length}\n`
                if (results.consistency.inconsistencies.length > 0) {
                    summaryMsg += `└─ Status: ❌ Issues detected\n\n`
                } else {
                    summaryMsg += `└─ Status: ✅ Consistent\n\n`
                }
            }
            
            // Member tracking results
            if (results.memberTracking) {
                summaryMsg += `👥 *Member Tracking:*\n`
                summaryMsg += `├─ Members: ${results.memberTracking.members?.length || 0}\n`
                summaryMsg += `├─ Banned: ${results.memberTracking.bannedMembers?.length || 0}\n`
                summaryMsg += `└─ Warned: ${Object.keys(results.memberTracking.warnedMembers || {}).length}\n\n`
            }
            
            // Settings persistence results
            if (results.settingsPersistence) {
                summaryMsg += `💾 *Settings Persistence:*\n`
                summaryMsg += `└─ Status: ${results.settingsPersistence.testPassed ? '✅ Working' : '❌ Failed'}\n\n`
            }
            
            // Query performance results
            if (results.queryPerformance) {
                summaryMsg += `⚡ *Query Performance:*\n`
                summaryMsg += `├─ Group Model: ${results.queryPerformance.groupAvgTime}ms\n`
                summaryMsg += `├─ Database Helper: ${results.queryPerformance.dbAvgTime}ms\n`
                summaryMsg += `└─ Performance Ratio: ${results.queryPerformance.performanceRatio.toFixed(2)}x\n\n`
            }
            
            summaryMsg += `📝 *Detailed logs have been saved to the console.*\n\n`
            summaryMsg += `💡 *Recommendations:*\n`
            
            // Add specific recommendations based on results
            if (results.consistency && results.consistency.inconsistencies.length > 0) {
                summaryMsg += `├─ Fix database inconsistencies between old and new models\n`
            }
            
            if (results.memberTracking && results.memberTracking.members?.length === 0) {
                summaryMsg += `├─ Member tracking is not working properly\n`
            }
            
            if (results.settingsPersistence && !results.settingsPersistence.testPassed) {
                summaryMsg += `├─ Settings persistence is failing\n`
            }
            
            if (results.queryPerformance && results.queryPerformance.performanceRatio > 2) {
                summaryMsg += `├─ Consider optimizing database queries\n`
            }
            
            summaryMsg += `└─ Check console logs for detailed information`
            
            await m.reply(summaryMsg)
            
        } catch (error) {
            console.error('Group diagnostics error:', error)
            await m.reply('❌ *Error*\nFailed to run group diagnostics. Please check the console for details.')
        }
    }
}

export default handler