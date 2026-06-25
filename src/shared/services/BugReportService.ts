import { supabase } from './supabase';

export interface BugReportPayload {
    message: string;
    platform: string;
    version: string;
}

export class BugReportService {
    /**
     * Submits a user manual bug report to the Supabase Edge Function.
     * Throws the error so caller UI context can handle and display toast alerts.
     */
    static async submitManualBugReport({ message, platform, version }: BugReportPayload): Promise<any> {
        try {
            console.log('[BugReportService] Submitting manual bug report:', { platform, version });
            
            const { data, error } = await supabase.functions.invoke('process-bug-report', {
                body: {
                    message,
                    appVersion: version,
                    devicePlatform: platform,
                },
            });

            if (error) {
                throw new Error(error.message || 'Failed to submit bug report');
            }

            return data;
        } catch (err: any) {
            console.error('[BugReportService.submitManualBugReport] error:', err);
            throw err;
        }
    }
}

export const submitManualBugReport = BugReportService.submitManualBugReport;
