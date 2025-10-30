const Airtable = require('airtable');

// ודא שמשתני הסביבה מוגדרים
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    console.error("Airtable environment variables are not set correctly.");
    exports.handler = async (event, context) => {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Airtable environment variables missing' }),
        };
    };
} else {
    // אתחול Airtable
    const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
    const table = base(AIRTABLE_TABLE_NAME);

    // פונקציית Netlify Function הראשית
    exports.handler = async (event, context) => {
        const { httpMethod, queryStringParameters } = event;
        
        try {
            switch (httpMethod) {
                // *** קריאה (READ) עם תיקון קריטי ל-Pagination ***
                case 'GET': {
                    const offset = queryStringParameters.offset || null;
                    const pageSize = 100; // הגבלת טעינה ל-100 רשומות בכל פעם - חובה!

                    let queryOptions = {
                        pageSize: pageSize,
                        view: "Grid view", // ודא ששם התצוגה תקין
                        sort: [{field: "#", direction: "asc"}]
                    };

                    if (offset) {
                        queryOptions.offset = offset;
                    }

                    // *** תיקון קריטי: שימוש ב-firstPage() כדי לוודא שנטענים רק 100 רשומות בפעימה ***
                    const records = await table.select(queryOptions).firstPage();
                    
                    // ה-offset הבא מגיע כמאפיין של האובייקט שמחזיר .firstPage() אם יש עוד נתונים
                    const nextOffset = records.offset || null; 
                    
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            records: records,
                            offset: nextOffset 
                        }),
                    };
                }

                // POST, PATCH, DELETE - נשארים זהים ותקינים
                case 'POST': {
                    const { fields } = JSON.parse(event.body);
                    const newRecord = await table.create([{ fields }]);
                    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRecord) };
                }

                case 'PATCH': {
                    const { id } = queryStringParameters;
                    const { fields } = JSON.parse(event.body);
                    if (!id) throw new Error('Record ID is required for PATCH.');
                    const updatedRecord = await table.update([{ id, fields }]);
                    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedRecord) };
                }

                case 'DELETE': {
                    const { id } = queryStringParameters;
                    if (!id) throw new Error('Record ID is required for DELETE.');
                    await table.destroy([id]);
                    return { statusCode: 200, body: JSON.stringify({ success: true, id }) };
                }

                default:
                    return { statusCode: 405, body: 'Method Not Allowed' };
            }
        } catch (error) {
            console.error('Airtable operation failed:', error.message);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }
    };
}
