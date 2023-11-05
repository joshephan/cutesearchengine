const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const initUrl = "https://en.wikipedia.org";

// 무한루프하는 함수를 만들어줘야 함
// 1. 특정 사이트에 방문
// 2. 그 사이트에서 HTML 문서를 파싱(cheerio)
// 3. 우리가 원하는 데이터만 추출 -> DB에 저장(fs로 파일로 저장)
// 4. 다음 방문할 사이트 목록을 획득 -> 참조된 사이트들은 페이지 랭크 점수를 획득
// 5. 1번으로 돌아가서 반복

let dbList = {
  "https://en.wikipedia.org/wiki/Computer": {
    title: "Computer",
    score: 1,
  },
};

let queue = []; // 메모리를 잡아먹는 부분
let progressIndex = 0;

const crawl = async (url) => {
  console.log("방문한 URL: ", url);
  console.log("방문 대기 중인 URL 개수: ", queue.length - progressIndex);

  try {
    var htmlDoc = await axios.get(url);
  } catch (error) {
    await startNextQueue();
    return;
  }

  if (!htmlDoc.data) {
    await startNextQueue();
    return;
  }

  const $ = cheerio.load(htmlDoc.data);
  const links = $("a");
  const title = $("h1").text();

  if (dbList[url]) {
    dbList[url].score += 1;
  } else {
    dbList[url] = {
      title,
      score: 1,
    };
  }

  links.each((index, element) => {
    const href = $(element).attr("href");

    if (!href) return;

    if (href.startsWith("http://") || href.startsWith("https://")) {
      checkAlreadyVisited(href);
      return;
    }

    const originUrl = new URL(url).origin;
    const newUrl = originUrl + href;
    checkAlreadyVisited(newUrl);
  });

  if (queue[progressIndex]) {
    await startNextQueue();
  } else {
    console.log("크롤링 종료");
    console.log(dbList);
  }
};

// 이미 방문한 사이트라면 큐에 넣지 않는다
const checkAlreadyVisited = (href) => {
  if (!dbList[href]) {
    queue.push(href);
  }
};

// 큐에 있는 다음 사이트를 방문한다
const startNextQueue = async () => {
  await timeout();
  crawl(queue[progressIndex]);
  progressIndex += 1;
  if (progressIndex % 10 === 0) {
    storeDb();
  }
};

// 딜레이를 만들어준다
const timeout = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 30);
  });
};

// 크롤링한 데이터를 파일로 저장한다
const storeDb = () => {
  const json = JSON.stringify(dbList);
  fs.writeFileSync("./db.json", json);
};

crawl(initUrl);
