const rp = require("request-promise");
const cheerio = require("cheerio");

const request = async (link, id) => {
  const options = {
    uri: link,
    transform: function (body) {
      return cheerio.load(body);
    }
  };

  const requestUrl = (html) => {
    try {
      const htmlString = html.text();

      const conditionToCheckStatusOfRelation =
        htmlString.search(`Toll! Die Relation ist in Ordnung`) !== -1 &&
        htmlString.search(`${id}`) !== -1;

      const error509 = `org.springframework.web.client.HttpServerErrorException: 509 Bandwidth Limit Exceeded`;
      if (htmlString.search(error509) !== -1) return -1;

      if (conditionToCheckStatusOfRelation) return 1;
      else return 0;
    } catch (err) {
      return -1;
    }
  };

  const request = await rp(options);
  const response = await requestUrl(request);

  return response;
};

async function scraper(id, i) {
  if (id.length <= 0) return;
  const url = `https://ra.osmsurround.org/analyzeRelation?relationId=${id}&noCache=true&_noCache=on`;
  const response = await request(url, id);
  return response;
}

module.exports = scraper;
