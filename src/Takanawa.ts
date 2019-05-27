const property = PropertiesService.getScriptProperties();
const SCRAPBOX_HOST = property.getProperty("SCRAPBOX_HOST");
const SCRAPBOX_PROJECT = property.getProperty("SCRAPBOX_PROJECT");
const SCRAPBOX_COOKIE = property.getProperty("SCRAPBOX_COOKIE");
const SLACK_WEBHOOK_URL = property.getProperty("SLACK_WEBHOOK_URL");

function doPost(event) {
  const postData = JSON.parse(event.postData.getDataAsString());

  console.log({ postData: postData });

  for (var i = 0; i < postData.attachments.length; i++) {
    const attachment = postData.attachments[i];
    const title = attachment.title;
    const body = fetchPageText(title);

    const channels = matchRules(title, body);

    if (channels.length > 0) {
      for (var j = 0; j < channels.length; j++) {
        postToSlack({ attachment: attachment, channel: channels[j] });
      }
    }
    else {
      postToSlack({ attachment: attachment });
    }
  }
}

function postToSlack(options) {
  const payload = {
    attachments: [options.attachment]
  };

  if (options.channel) {
    payload["channel"] = options.channel;
  }

  const response = UrlFetchApp.fetch(SLACK_WEBHOOK_URL, { method: 'post', payload: JSON.stringify(payload) });

  console.log({
    response: response,
    payload: payload
  });
}

function fetchPageText(title) : string {
  const url = `https://${SCRAPBOX_HOST}/api/pages/${SCRAPBOX_PROJECT}/${encodeURIComponent(title)}/text`;
  const headers = { 'Cookie' : 'connect.sid=' + SCRAPBOX_COOKIE };
  const response = UrlFetchApp.fetch(url, { method: "get", headers : headers });

  return response.getContentText();
}

function matchRules(title : string, body : string) : Array<string> {
  const channels = [];
  const rules = loadRules();

  for (var i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (rule.title.length > 0 && title.indexOf(rule.title) != -1) {
      if (channels.indexOf(rule.channel) == -1) {
        channels.push(rule.channel);
      }
    }

    if (rule.body.length > 0 && body.indexOf(rule.body) != -1) {
      if (channels.indexOf(rule.channel) == -1) {
        channels.push(rule.channel);
      }
    }
  }

  return channels;
}

function loadRules() {
  const rules = [];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  for (var i = 2; i <= sheet.getLastRow(); i++) {
    const row = sheet.getRange(i, 1, 1, 3);
    const values = row.getValues()[0];

    const title = values[0];
    const body = values[1];
    const channel = values[2];

    rules.push({ title: title, body: body, channel: channel });
  }

  return rules;
}
