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
        const { httpMethod, queryStringParameters, body } = event;
        
        try {
            switch (httpMethod) {
                // *** קריאה (GET) - טעינת כל הרשומות בבת אחת ***
                case 'GET': {
                    // הגדרת אפשרויות הקריאה
                    let queryOptions = {
                        view: "Grid view", // ודא ששם התצוגה תקין
                        // ה-SDK של Airtable יטפל בטעינת כל הדפים (100 רשומות בכל פעם)
                        // לכן אין צורך להגדיר offset או pageSize
                    };

                    // **התיקון הקריטי:** שימוש בפונקציה .all()
                    // פונקציה זו מבצעת את כל הקריאות ההדרגתיות הנדרשות ומחזירה את *כל* הרשומות במערך אחד.
                    const records = await table.select(queryOptions).all();
                    
                    // לאחר שימוש ב-.all(), אין יותר offset להחזיר
                    const nextOffset = null; 
                    
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            records: records,
                            // החזרת null כדי לאותת ל-Frontend שאין עוד נתונים לטעינה.
                            offset: nextOffset 
                        }),
                    };
                }

                // *** יצירה (POST) ***
                case 'POST': {
                    const { fields } = JSON.parse(body);
                    const newRecord = await table.create([{ fields }]);
                    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRecord) };
                }

                // *** עדכון (PATCH) ***
                case 'PATCH': {
                    const { id } = queryStringParameters;
                    const { fields } = JSON.parse(body);
                    if (!id) throw new Error('Record ID is required for PATCH.');
                    const updatedRecord = await table.update([{ id, fields }]);
                    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedRecord) };
                }

                // *** מחיקה (DELETE) ***
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
