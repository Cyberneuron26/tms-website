/*
import 'server-only';
import { google } from 'googleapis';
import { unstable_cache } from 'next/cache';
import { parseWorkbook } from './parse';
import { demo } from './demo';
const names=['SchoolInfo','SiteSettings','Students','Teachers','Notifications','Events'];
async function load(){
 if(process.env.DEMO_MODE==='true')return demo;
 const spreadsheetId=process.env.GOOGLE_SPREADSHEET_ID,client_email=process.env.GOOGLE_CLIENT_EMAIL,private_key=process.env.GOOGLE_PRIVATE_KEY;
 if(!spreadsheetId||!client_email||!private_key)throw new Error('Google Sheets credentials are not configured');
 const auth=new google.auth.JWT({email:client_email,key:private_key.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
 const sheets=google.sheets({version:'v4',auth});
 const res=await sheets.spreadsheets.values.batchGet({spreadsheetId,ranges:names.map(n=>`'${n}'!A1:Z10000`),valueRenderOption:'FORMATTED_VALUE'});
 const contents:Record<string,string[][]>={};names.forEach((n,i)=>contents[n]=(res.data.valueRanges?.[i]?.values??[]) as string[][]);
 return parseWorkbook(contents);
}
// Next persistent data cache: on-demand invalidation or automatic 5-minute refresh.
export const getSiteData=unstable_cache(load,['school-workbook-v1'],{tags:['school-content'],revalidate:300});
*/
import 'server-only';
import { google } from 'googleapis';
import { unstable_cache } from 'next/cache';
import { parseWorkbook } from './parse';
import { demo } from './demo';
// Keep your existing parseWorkbook import here.

const names = [
  'SchoolInfo',
  'SiteSettings',
  'Students',
  'Teachers',
  'Notifications',
  'Events',
];

async function load() {
  if (process.env.DEMO_MODE === 'true') {
    return demo;
  }

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const client_email = process.env.GOOGLE_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !client_email || !private_key) {
    throw new Error('Google Sheets credentials are not configured');
  }

  const formattedPrivateKey = private_key
  .replace(/\\n/g, '\n')
  .trim();

  const auth = new google.auth.JWT({
    email: client_email,
    key: formattedPrivateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  });

  const sheets = google.sheets({
    version: 'v4',
    auth,
  });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: names.map(n => `'${n}'!A1:Z10000`),
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const contents: Record<string, string[][]> = {};

  names.forEach((n, i) => {
    contents[n] = (
      res.data.valueRanges?.[i]?.values ?? []
    ) as string[][];
  });

  return parseWorkbook(contents);
}

export const getSiteData = unstable_cache(
  load,
  ['school-workbook-v1'],
  {
    tags: ['school-content'],
    revalidate: 300,
  }
);