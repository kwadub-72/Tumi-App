import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Retrieve credentials securely from Deno env
        const apiKey = Deno.env.get('LINEAR_API_KEY');
        const teamId = Deno.env.get('LINEAR_TEAM_ID');

        if (!apiKey || !teamId) {
            console.error("Missing environment variables: LINEAR_API_KEY or LINEAR_TEAM_ID is not set.");
            return new Response(
                JSON.stringify({ error: "Edge Function configuration error: Missing Linear credentials." }), 
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const payload = await req.json();
        const record = payload.record;

        if (!record) {
            console.error("Payload record is missing. Received payload:", JSON.stringify(payload));
            return new Response(
                JSON.stringify({ error: "Invalid payload: record field is missing." }), 
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const description = record.description || '';
        const deviceInfo = record.device_info || {};

        // Derive issue title from first line of description
        let title = 'Bug Report via App';
        if (description.trim().length > 0) {
            const firstLine = description.split('\n')[0].trim();
            title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
        }

        // Format description in Markdown for Linear
        const formattedDescription = `${description}\n\n---\n**Device Info:**\n\`\`\`json\n${JSON.stringify(deviceInfo, null, 2)}\n\`\`\``;

        // Perform Linear GraphQL API call
        const response = await fetch("https://api.linear.app/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": apiKey,
            },
            body: JSON.stringify({
                query: `
                    mutation IssueCreate($input: IssueCreateInput!) {
                        issueCreate(input: $input) {
                            success
                            issue {
                                id
                                title
                                url
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        title,
                        description: formattedDescription,
                        teamId: teamId,
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Linear API returned non-200 response:", response.status, errorText);
            throw new Error(`Linear API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (result.errors) {
            console.error("Linear GraphQL errors:", JSON.stringify(result.errors));
            throw new Error(`Linear GraphQL error: ${result.errors[0]?.message}`);
        }

        console.log("Successfully created Linear issue:", result.data?.issueCreate?.issue?.id);

        return new Response(
            JSON.stringify({ 
                success: true, 
                issue: result.data?.issueCreate?.issue 
            }), 
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error: any) {
        console.error("Error dispatching bug report to Linear:", error);
        return new Response(
            JSON.stringify({ error: error.message }), 
            {
                status: 200, // Returning 200 to prevent Supabase webhook retries/failure locks
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
