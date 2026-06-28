import { getGoogleAccessToken } from "./tokens";

function base64Url(input:string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMime(input:{
  to:string;
  subject:string;
  body:string;
}) {
  return [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ].join("\r\n");
}

export async function searchGmail(userId:string, query:string = "in:inbox", maxResults:number = 10) {
  const token = await getGoogleAccessToken(userId);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers:{ Authorization:`Bearer ${token}` } }
  );

  const list = await listRes.json();

  if (!listRes.ok) throw new Error("Gmail search failed.");

  const messages = list.messages ?? [];

  const hydrated = await Promise.all(
    messages.map(async (msg:any) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers:{ Authorization:`Bearer ${token}` } }
      );

      const data = await res.json();

      const headers = data.payload?.headers ?? [];

      return {
        id:data.id,
        threadId:data.threadId,
        snippet:data.snippet,
        from:headers.find((h:any) => h.name === "From")?.value ?? "",
        subject:headers.find((h:any) => h.name === "Subject")?.value ?? "(No subject)",
        date:headers.find((h:any) => h.name === "Date")?.value ?? "",
      };
    })
  );

  return hydrated;
}

export async function createGmailDraft(userId:string, input:{
  to:string;
  subject:string;
  body:string;
}) {
  const token = await getGoogleAccessToken(userId);

  const raw = base64Url(buildMime(input));

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json",
    },
    body:JSON.stringify({
      message:{ raw },
    }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error("Gmail draft failed.");

  return data;
}

export async function sendGmail(userId:string, input:{
  to:string;
  subject:string;
  body:string;
}) {
  const token = await getGoogleAccessToken(userId);

  const raw = base64Url(buildMime(input));

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method:"POST",
    headers:{
      Authorization:`Bearer ${token}`,
      "Content-Type":"application/json",
    },
    body:JSON.stringify({ raw }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error("Gmail send failed.");

  return data;
}
