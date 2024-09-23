
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import { chromium } from 'playwright';
import TurndownService from 'turndown';

export const lambdaHandler = async (event, lambdaContext) => {

  const url = event.url;
  const userAgent = event.userAgent;

  const browser = await chromium.launch({
    args: [
      "--single-process",
      "--no-zygote",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--headless=new",
    ]
  });
  
  const context = await browser.newContext({
    userAgent: userAgent
  });

  const page = await context.newPage();
  const pageResponse = await page.goto(url);

  const html = await page.content();
  const status = pageResponse.status();

  browser.close();

  const response = {
    statusCode: status
  };

  if (pageResponse.ok()) {

    // https://stackoverflow.com/questions/69906136/console-error-error-could-not-parse-css-stylesheet
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => {
      // No-op to skip console errors.
    });

    const doc = new JSDOM(html, { virtualConsole });

    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(article.content);

    response.body = JSON.stringify({
      title: article.title,
      markdown: markdown
    });
  }

  return response;

};
