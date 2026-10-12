/** Installable spreadsheet edit trigger. In Script Properties set SITE_URL and REVALIDATE_SECRET. */
function onSchoolSheetEdit(e) {
  const props=PropertiesService.getScriptProperties();
  const url=props.getProperty('SITE_URL');
  const secret=props.getProperty('REVALIDATE_SECRET');
  if(!url||!secret)throw new Error('Missing script properties');
  const response=UrlFetchApp.fetch(url.replace(/\/$/,'')+'/api/revalidate',{
    method:'post',headers:{'x-revalidate-secret':secret},contentType:'application/json',payload:'{}',muteHttpExceptions:true
  });
  if(response.getResponseCode()!==200)throw new Error('Revalidation failed: '+response.getResponseCode());
}
