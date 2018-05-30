// TUTORIAL AT http://www.netinstructions.com/how-to-make-a-simple-web-crawler-in-javascript-and-node-js/
// WEB DB PHP TUTORIAL https://www.sitepoint.com/publishing-mysql-data-web/
// SECURITY  https://security.stackexchange.com/questions/152590/how-to-securely-connect-to-a-database-with-php
// GOOGLE MAPS MARKERS -  https://developers.google.com/maps/documentation/javascript/examples/marker-remove
var request = require('request'); // for requesting HTML pages
var cheerio = require('cheerio'); // for grabbing fields from HTML
var URL = require('url-parse'); // not sure we use this ?
var mysql = require('mysql'); // database
var he = require('he'); // for decoding &amp and other chars from html
var fs = require("fs"); // for reading ini file credentials and kingston happenings

var googleMapsClient;
var DBNAME;// = "hveventm_events"; // "hveventdb";
var DBTABLE;// = "events";
var USERNAME;
var PASSWORD;
var con;

var CLEAR_DB_ON_START = false;
var MAX_PAGES_TO_VISIT = 10;
var MAX_BSP_PAGES_TO_VISIT = 10;
var MAX_HV1_CATEGORIES_TO_VISIT = 10;
var eventsFoundCount = 0;
var eventCallbackCount = -1;
var crawlFunctionsCount = 0;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];

try {
  var data = fs.readFileSync('db.ini', 'utf8');
  var javascript_ini = parseINIString(data);
  console.log(javascript_ini);
  USERNAME = javascript_ini['crawlerusername'];
  PASSWORD = javascript_ini['crawlerpassword'];
  DBNAME = javascript_ini['db'];
  DBTABLE = javascript_ini['table'];
  GMAPSKEY = javascript_ini['gmapkey'];
 // console.log("USERNAME IS " + USERNAME);
//  process.exit();
  con = mysql.createConnection({
    host: "localhost",
    user: USERNAME, // "root",
    password: PASSWORD, // "hello123",
    database: DBNAME
  });
  googleMapsClient = require('@google/maps').createClient({
    key: GMAPSKEY
  });
} 
catch(e) {
  console.log(" Could not load login credentials from ini file");
  console.log(e);
  process.exit();
}

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to DB: " + DBNAME);
  if (CLEAR_DB_ON_START) clearEventDB();
  else crawlFunctions[crawlFunctionsCount](); // kick off the first, and they daisy chain along to the end
});

var crawlFunctions = [
 // crawlHvOne,
//  function() { crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/music/", 'music', MAX_HV1_CATEGORIES_TO_VISIT); },
//  crawlBSP,
//  crawlRoughDraft,
  //crawlKingstonHappenings  // deprecated, only finds current day of events
  crawlKingstonHappeningsEvents
]

//crawlHvOne();

//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/music/", 'music', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/food-drink/", 'food-drink', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/kids-family/", 'kids-family', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/arts-entertainment/", 'arts-entertainment', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/dance/", 'dance', MAX_PAGES_TO_VISIT);

function clearEventDB() {
  var sql = "TRUNCATE TABLE " + DBTABLE + ";";
  console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Cleared table: " + DBTABLE);
    crawlFunctions[crawlFunctionsCount](); // kick off the first, and they daisy chain along to the end
  });
}

function nextCrawlFunction() {
  crawlFunctionsCount++;
  if (crawlFunctionsCount < crawlFunctions.length) {
    crawlFunctions[crawlFunctionsCount]();
    eventCallbackCount = 0;
  } else {
    console.log('--------------------------------');
    console.log("Done.  Exiting.");
    process.exit();
  }

}
var kingstonHappeningsEvents =  [];
var kingstonHappeningsEventCrawlCounter = 0;
function crawlKingstonHappeningsEvents() {

  var path = "kingstonhappenings.org/events";  // directory from "wget --spider -r --no-parent http://kingstonhappenings.org/events/""

  fs.readdir(path, function(err, items) {
    if (err) {
      console.log(err);
      return;
    }
    for (var i = 0; i < items.length; i++) {
      kingstonHappeningsEvents.push("http://kingstonhappenings.org/events/" + items[i]);
      console.log("Pushed onto event list: http://kingstonhappenings.org/events/" + items[i] )
      }
    eventCallbackCount += items.length;
    crawlKingstonHappeningsEvent();
 });
}

function crawlKingstonHappeningsEvent() {
  if (kingstonHappeningsEventCrawlCounter < kingstonHappeningsEvents.length) {
    PAGE_URL = kingstonHappeningsEvents[kingstonHappeningsEventCrawlCounter];
    kingstonHappeningsEventCrawlCounter++;
    //  console.log("NEXT EVENT : count=" + kingstonHappeningsEventCrawlCounter)
  } else {
    console.log(" DONE WITH KINGSTON HAPPENINGS EVENTS");
    return;
  }

  request(PAGE_URL, function(error, response, body, page) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      console.log(" Status Code: " + response.statusCode);
      console.log(error);
      return;
    }
    console.log("Visiting page " + this.page);

    var $ = cheerio.load(body);
    var title = $('html').find('#main > div.container_wrap.container_wrap_first.main_color.sidebar_right > div > main > article > div.entry-content-wrapper.clearfix.standard-content > header > h1 > a').text().trim();
    if (title == '') {
      eventCallbackCount--;
      crawlKingstonHappeningsEvent();
      return;
    }
    $('html').find('div.entry-content').each(function(index, element) {
      var time = $(element).find('p:nth-child(1)').find('i').text();
      var date = $(element).find('p').eq(0).text().replace('Date/Time', '').replace('Date(s) -', '').trim().split(' ')[0].replace('/', '-');
      // switch date format from 05/24/2018  to  2018-05-24
      date = date.substring(6, 10) + '-' + date.substring(0, 5);

      var yesterdaysDate = new Date();
      yesterdaysDate.setDate(yesterdaysDate.getDate() - 1);
      var eventDate = Date.parse(date.trim());
      if ((yesterdaysDate > eventDate) || isNaN(eventDate)) {
        console.log("SKIPPING EVENT: " + title + " .... EVENT DATE: " + eventDate + " / " + date);
        eventCallbackCount--;
        crawlKingstonHappeningsEvent();
        return;
      }
      //  else {
      //    console.log("NOT SKIPPING EVENT: " + title + " .... EVENT DATE: " + eventDate + " / " + date + " IS MORE THAN TODAY'S DATE: " + yesterdaysDate);
      //  }

      var location = $(element).find('p').eq(1).text().replace('Location', '').trim() + ", Kingston";
      var description = $(element).find('p').slice(3, -1).text().trim(); // $(element).text().replace(/[\t]/g, "");

      // LAT LNG IN KINGSTON WILL ALWAYS BE  41.XXXXX   or   42.xxxxxxx  and  -74.xxxx  or -73.xxxxxxxxxx
      var lat = $(element).find('p').last().find('.em-location-map-coords').find('.lat').text();
      var lng = $(element).find('p').last().find('.em-location-map-coords').find('.lng').text();

      if ((lat == '') || (lng == '')) {
        geocode_result = googleMapsClient.geocode({
          address: location + " NY"
        }, function(err, response, date, time, title, description, location) {
          if (!err) {
            lat = response.json.results[0].geometry.location.lat;
            lng = response.json.results[0].geometry.location.lng;
            addEvent(this.date, this.time, this.title, this.description, this.location, lat, lng);
          }
          if (err == "timeout") {
            eventCallbackCount--;
            console.log("Error geocoding: " + err + ". Check quota at https://console.developers.google.com/google/maps-apis/apis/geocoding-backend.googleapis.com/quotas?project=pyeventmap&duration=PT1H ")
          } else if (err) {
            eventCallbackCount--;
            console.log("Error geocoding: " + err)
          }
        }.bind({
          date: date,
          time: time,
          title: title,
          description: description,
          location: location
        }));
        crawlKingstonHappeningsEvent();
        return;
      }
      console.log('--------------------------------');
      console.log("DATE: " + date);
      console.log("TIME: " + time);
      console.log("TITLE: " + title);
      console.log("DESCRIPTION: " + description);
      console.log("LOCATION: " + location);
      console.log("LAT: " + lat);
      console.log("LNG: " + lng);

      // Do not add duplicates
      var sql = "INSERT IGNORE INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
      //  var sql = "INSERT INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) SELECT '" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + " FROM " + DBTABLE + " WHERE NOT EXISTS (SELECT 1 FROM " + DBTABLE + " WHERE lat=" + lat + " AND lng=" + lng + " AND date='" + mysql_real_escape_string(date) + "');";

      //    console.log("SQL: " + sql);
      con.query(sql, function(err, result) {
        if (err) throw err;
        eventCallbackCount--;
        console.log("Kingston Happenings EVENTS LEFT TO PROCESS: " + eventCallbackCount);
        if (eventCallbackCount <= 0) {
          console.log('--------------------------------');
          console.log("Done finding Kingston Happenings events. "); // Exiting.");
          console.log('--------------------------------');
          nextCrawlFunction();
        }
      });
      crawlKingstonHappeningsEvent();
    });
  }.bind({
    page: PAGE_URL
  }));
}

function crawlKingstonHappeningsLink(PAGE_URL, title, date, VISITCOUNTER) {
  console.log("Visiting Kingston Happenings page #" + (VISITCOUNTER + 1) + ": " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    var $ = cheerio.load(body);

    //$().find('#main > div.main_color.container_wrap_first.container_wrap.sidebar_right > div > main > div > div > section.avia_codeblock_section.avia_code_block_0 > div > div.wpfc-calendar-wrapper > form > div.fc-view-container > div > table > tbody > tr > td > div > div > div > div.fc-content-skeleton > table > tbody > tr:nth-child(1) > td:nth-child(6) > a > div').each(function(index, element) {
    //    $('html > body > div > #wrcon > #content > div > div > div > evnsg-head').find('event-text').each(function(index, element) {
    $('html').find('div.entry-content').each(function(index, element) {
      //  console.log("HELLOO");
      //  console.log($(element).html());
      var time = $(element).find('p').find('i').text();
      var date = $(element).find('p').eq(0).text().replace('Date/Time', '').replace('Date(s) -', '').trim().split(' ')[0].replace('/', '-');
      // switch date format from 05/24/2018  to  2018-05-24
      date = date.substring(6, 10) + '-' + date.substring(0, 5);
      var location = $(element).find('p').eq(1).text().replace('Location', '').trim() + ", Kingston";
      //      var description = $(element).find('p').eq(3).text().trim();// $(element).text().replace(/[\t]/g, "");
      var description = $(element).find('p').slice(3, -1).text().trim(); // $(element).text().replace(/[\t]/g, "");

      // LAT LNG IN KINGSTON WILL ALWAYS BE  41.XXXXX   or   42.xxxxxxx  and  -74.xxxx  or -73.xxxxxxxxxx
      var lat = $(element).find('p').last().find('.em-location-map-coords').find('.lat').text();
      var lng = $(element).find('p').last().find('.em-location-map-coords').find('.lng').text();
      eventCallbackCount++;

      if ((lat == '') || (lng == '')) {
        return;
        geocode_result = googleMapsClient.geocode({
          address: location + " NY"
        }, function(err, response, date, time, title, description, location) {
          if (!err) {
            lat = response.json.results[0].geometry.location.lat;
            lng = response.json.results[0].geometry.location.lng;
            addEvent(this.date, this.time, this.title, this.description, this.location, lat, lng);
          }
          if (err == "timeout") {
            eventCallbackCount--;
            console.log("Error geocoding: " + err + ". Check quota at https://console.developers.google.com/google/maps-apis/apis/geocoding-backend.googleapis.com/quotas?project=pyeventmap&duration=PT1H ")
          } else if (err) {
            eventCallbackCount--;
            console.log("Error geocoding: " + err)
          }
        }.bind({
          date: date,
          time: time,
          title: title,
          description: description,
          location: location
        }));
        return;
      }

      console.log('--------------------------------');
      console.log("DATE: " + date);
      console.log("TIME: " + time);
      console.log("TITLE: " + title);
      console.log("DESCRIPTION: " + description);
      console.log("LOCATION: " + location);
      console.log("LAT: " + lat);
      console.log("LNG: " + lng);
      //     process.exit();
      //     return;
      var sql = "INSERT IGNORE INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
      //      console.log("SQL: " + sql);
      con.query(sql, function(err, result, sql) {
        console.log("SQL: " + this.sql);
        if (err) throw err;
        eventCallbackCount--;
        console.log("Kingston Happenings EVENTS LEFT TO PROCESS: " + eventCallbackCount);
        if (eventCallbackCount == 0) {
          console.log('--------------------------------');
          console.log("Done finding Kingston Happenings events. "); // Exiting.");
          console.log('--------------------------------');
          nextCrawlFunction();
        }
      }.bind({
        sql: sql
      }));
    });
  });
}

function crawlKingstonHappenings() {
  var PAGE_URL = "http://kingstonhappenings.org/events/";
  console.log("Visiting page " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    // Parse the document body
    var $ = cheerio.load(body);
    var eventCount = 0;
    //    $('html > body > div > div#wrcon > div#content > div.col-left-media > div.ev1page.clearfix').children().find('h2.ev2page-title a').each(function(index, element) {
    //    $('html').find('a.fc-day-grid-event.fc-h-event.fc-event.fc-start.fc-end').each(function(index, element) {
    //    $('html.html_boxed.responsive.av-preloader-disabled.av-default-lightbox.html_header_top.html_logo_left.html_main_nav_header.html_menu_right.html_custom.html_header_sticky.html_header_shrinking.html_header_topbar_active.html_mobile_menu_tablet.html_header_searchicon.html_content_align_center.html_header_unstick_top.html_header_stretch_disabled.html_av-overlay-side.html_av-overlay-side-classic.html_av-submenu-noclone.html_entry_id_117067.av-no-preview.html_text_menu_active.avia_desktop.js_active.avia_transform.avia_transform3d.avia_transform.avia_transform3d.avia-webkit.avia-webkit-66.avia-chrome.avia-chrome-66').each(function(index, element) {
    //    $('html').find('div._d97').each(function(index, element) {  // THIS WORKS
    //    $('html').find('div.avia_codeblock').each(function(index, element) {  // THIS WORKS
    $('html').find('div.avia_codeblock').find('td a').each(function(index, element) {
      //console.log($(element).html());
      var link = $(element).attr('href');
      var title = $(element).text();
      var date = link.substring(link.length - 11, link.length - 1);
      console.log("LINK: " + link + "  title: " + title + " date: " + date);
      // Go to link of each event and then add it to DB
      eventCallbackCount++;
      crawlKingstonHappeningsLink(link, title, date, eventCount);
      eventCount++;
    });

  });
}

function crawlRoughDraft() {
  var PAGE_URL = "https://www.roughdraftny.com/events/";
  var options = {
    url: PAGE_URL,
    headers: {
      'User-Agent': 'request'
    }
  };
  console.log("Visiting page " + PAGE_URL);

  request(options, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      console.log(" Status Code: " + response.statusCode);
      console.log(error);
      return;
    }
    // Parse the document body
    var $ = cheerio.load(body);
    var eventCount = 0;
    $('html').find('section#page').each(function(index, element) {
      var title = $(element).text();
      //      console.log(title);
    });
    $('html').find('article.eventlist-event--upcoming.eventlist-event--hasimg.eventlist-hasimg').each(function(index, element) {
      var title = $(element).find('a.eventlist-title-link').text();
      var date = $(element).find('time.event-date').attr('datetime');
      var time = $(element).find('time.event-time-12hr-start').text() + " - " + $(element).find('span.event-time-12hr > time.event-time-12hr-end').text();
      var location = "Rough Draft, Kingston"; //"BSP Lounge (" + $(element).find('div.evsng-cell-info')[0].text() + "), Kingston";
      var description = $(element).find('.eventlist-excerpt').text(); // $(element).text().replace(/[\t]/g, "");
      var lat = 41.933513; //  82 John St, Kingston, NY 12401
      var lng = -74.021245; //  82 John St, Kingston, NY 12401

      console.log('--------------------------------');
      console.log("DATE: " + date);
      console.log("TIME: " + time);
      console.log("TITLE: " + title);
      console.log("DESCRIPTION: " + description);
      console.log("LOCATION: " + location);
      eventCallbackCount++;
      // Do not add duplicates
      var sql = "INSERT IGNORE INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
      //  var sql = "INSERT INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) SELECT '" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + " FROM " + DBTABLE + " WHERE NOT EXISTS (SELECT 1 FROM " + DBTABLE + " WHERE lat=" + lat + " AND lng=" + lng + " AND date='" + mysql_real_escape_string(date) + "');";

      console.log("SQL: " + sql);
      con.query(sql, function(err, result) {
        if (err) throw err;
        eventCallbackCount--;
        console.log("ROUGH DRAFT EVENTS LEFT TO PROCESS: " + eventCallbackCount);
        if (eventCallbackCount == 0) {
          console.log('--------------------------------');
          console.log("Done finding Rough Draft events. "); // Exiting.");
          console.log('--------------------------------');
          nextCrawlFunction();
        }
      });
    });
  });
}

function crawlBspLink(PAGE_URL, date, VISITCOUNTER) {
  console.log("Visiting BSP  page #" + (VISITCOUNTER + 1) + ": " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    var $ = cheerio.load(body);
    //    $('html > body > div > #wrcon > #content > div > div > div > evnsg-head').find('event-text').each(function(index, element) {
    $('html > body > div > #wrcon > #content > div.col-left-single > div.single-col.clearfix > div.event-text').each(function(index, element) {
      var title = $(element).find('h2.event-title').text();
      //var date = '';
      var time = '';
      var location = ""; //"BSP Lounge (" + $(element).find('div.evsng-cell-info')[0].text() + "), Kingston";
      var description = ''; // $(element).text().replace(/[\t]/g, "");
      var lat = 41.934643; // BSP lounge - 323 Wall St, Kingston, NY 12401
      var lng = -74.020760; // BSP lounge - 323 Wall St, Kingston, NY 12401
      $(element).find('p').each(function(index, subelement) {
        if ($(subelement).text() != '') description += $(subelement).text() + "\n";
        //  console.log($(subelement).text());
        //  console.log("index: " + index);
      });
      // eventtitle = eventtitle.replace(/[\n\t\r]/g, "");
      $(element).find('div.evsng-info').children().find('div.evsng-cell-info').each(function(index, subelement) {
        if (index == 0) {
          location = $(subelement).text();
          if (!location.includes("Kingston")) location = location + ", BSP Lounge, Kingston";
        }
        if (index == 1) time = $(subelement).text();
        // console.log($(subelement).text());
        // console.log("index: " + index);
      });
      console.log('--------------------------------');
      console.log("DATE: " + date);
      console.log("TIME: " + time);
      console.log("TITLE: " + title);
      console.log("DESCRIPTION: " + description);
      console.log("LOCATION: " + location);

      var sql = "INSERT IGNORE INTO " + DBTABLE + " (date, time, title, description, location, lat, lng, type) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ", 'music');";
      //  console.log("SQL: " + sql);
      con.query(sql, function(err, result) {
        if (err) throw err;
        eventCallbackCount--;
        console.log("BSP EVENTS LEFT TO PROCESS: " + eventCallbackCount);
        if (eventCallbackCount == 0) {
          console.log('--------------------------------');
          console.log("Done finding BSP events. "); // Exiting.");
          console.log('--------------------------------');
          nextCrawlFunction();
        }
      });

    });
  });
}

function crawlBSP() {
  var PAGE_URL = "http://bspkingston.com/events/";
  console.log("Visiting page " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    // Parse the document body
    var $ = cheerio.load(body);
    var eventCount = 0;

    //    $('html > body > div > div#wrcon > div#content > div.col-left-media > div.ev1page.clearfix').children().find('h2.ev2page-title a').each(function(index, element) {
    $('html > body > div > div#wrcon > div#content > div.col-left-media > div.ev1page.clearfix > div.home-width > div.ev2page-col').each(function(index, element) {
      var day = $(element).find('div.ev2page-day').text();
      var month = $(element).find('div.ev2page-month').text();
      var year = $(element).find('div.ev2page-year').text();
      var date = year + '-' + getMonthFromString(month) + '-' + day;
      var eventlink = $(element).find('h2.ev2page-title a').attr('href');
      console.log("LINK: " + eventlink + "  DAY: " + day + " MONTH: " + month + " YEAR: " + year);
      console.log(date);
      // Go to link of each event and then add it to DB
      eventCallbackCount++;
      crawlBspLink(eventlink, date, eventCount);
      eventCount++;
    });
  });
}

function crawlHvOneCategory(PAGE_URL, CATEGORY_TYPE, VISITCOUNTER) {
  console.log("Visiting " + CATEGORY_TYPE + " page #" + (MAX_HV1_CATEGORIES_TO_VISIT - VISITCOUNTER + 1) + ": " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    // Check status code (200 is HTTP OK)
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    var $ = cheerio.load(body);
    $('html > body > #page > #content > #primary > #main').find('a.tribe-event-url').each(function(index, element) {
      eventtitle = $(element).text();
      eventtitle = eventtitle.replace(/[\n\t\r]/g, "");
      //  console.log(eventtext);
      //   UPDATE table1 dest, (SELECT * FROM table2 where id=x) src 
      //   SET dest.col1 = src.col1 WHERE dest.id=x 
      var sql = "UPDATE " + DBTABLE + " dest, (SELECT * FROM " + DBTABLE + " WHERE title = '" + mysql_real_escape_string(eventtitle) + "') src SET dest.type='" + CATEGORY_TYPE + "' where dest.title='" + mysql_real_escape_string(eventtitle) + "';";
      //   var sql = "SELECT * FROM " + DBTABLE + " WHERE title = '" + mysql_real_escape_string(eventtitle) + "';";
      //   console.log("SQL: " + sql);
      con.query(sql, function(err, result) {
        //     console.log(result);
        if (err) throw err;
      });
    });

    $('html > body > #page > #content > #primary > #main').find('#tribe-events-footer ul li a').each(function(index, element) {
      if ($(element).attr('rel') == 'prev') return;
      var nextpage = $(element).attr('href');
      if (VISITCOUNTER > 0) crawlHvOneCategory(nextpage, CATEGORY_TYPE, (VISITCOUNTER - 1), 10);
      else {
        console.log("VISITED " + MAX_HV1_CATEGORIES_TO_VISIT + " " + CATEGORY_TYPE + " PAGES.... DONE.");
        console.log('--------------------------------');
        nextCrawlFunction();
      }
    });
  });
}

function addEvent(date, time, title, description, location, lat, lng) {
  console.log('--------------------------------');
  console.log("DATE: " + date);
  console.log("TIME: " + time);
  console.log("TITLE: " + title);
  console.log("DESCRIPTION: " + description);
  console.log("LOCATION: " + location);
  console.log("LAT: " + lat + ", LNG: " + lng);
  // TODO ::  If title exists already,  append date instead of inserting new entry
  var sql = "INSERT IGNORE INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
  //console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
  });
  console.log("EVENTS LEFT TO PROCESS: " + eventCallbackCount + " OF " + eventsFoundCount);
  eventCallbackCount--;
  if (eventCallbackCount == 0) {
    console.log('--------------------------------');
    console.log("Done adding events.  "); // Exiting.");
    console.log('--------------------------------');
    nextCrawlFunction();
    //  crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/music/", 'music', MAX_PAGES_TO_VISIT);
    //  process.exit();
  }
}

function crawlHvOne() {
  var PAGE_URL = "https://calendar.hudsonvalleyone.com/browsable/";
  var divList = [];
  var dateList = [];

  console.log("Visiting page " + PAGE_URL);

  request(PAGE_URL, function(error, response, body) {
    //    console.log("Error is: " + error);
    //    console.log("Status code: " + response.statusCode);
    if (response.statusCode !== 200) {
      console.log(" Incorrect status. Exiting.");
      return;
    }
    // Parse the document body
    var $ = cheerio.load(body);
    var dateCount = 0;
    //   $('html > body > #page > #content > #primary > #main').find('div.'+SEARCH_DIV+' > p').each(function (index, element) {
    $('html > body > #page > #content > #primary > #main').find('div.entry-content').children().find('p').each(function(index, element) {
      var elemdate = $(element).parent().attr('class') + '';
      if (elemdate.substring(0, 2) == "20") {
        if (dateList.indexOf(elemdate) == -1) {
          //    console.log("Found new date: " + elemdate);
          dateList[dateCount] = elemdate;
          dateCount++;
        }
      }
      eventhtml = $(element).html();
      eventtext = $(element).text();
      // console.log(eventhtml);
      var time = eventhtml.substring(eventhtml.indexOf('\'') + 1, eventhtml.indexOf('<strong>')).trim();
      var date = elemdate.insert(4, "-").insert(7, '-');
      //    console.log(date);
      var title = $(element).find('a').text();
      var location = he.decode(eventhtml.substring(eventhtml.lastIndexOf('\n') + 1).replace('.', '').trim());
      if (location.length < 5) {
        console.log("NO LOCATION FOUND FOR EVENT")
        console.log(" TIME: " + time + " DATE: " + date + " TITLE: " + title);
        console.log(eventtext);
        return;
      }
      eventsFoundCount++;
      console.log("LOCATION: " + location);
      var description = eventtext.substring(eventtext.indexOf(title) + title.length).split('\n')[0].trim();
      geocode_result = googleMapsClient.geocode({
        address: location + " NY"
      }, function(err, response, date, time, title, description, location) {
        if (!err) {
          lat = response.json.results[0].geometry.location.lat;
          lng = response.json.results[0].geometry.location.lng;
          addEvent(this.date, this.time, this.title, this.description, this.location, lat, lng);
        }
        if (err == "timeout") {
          eventCallbackCount--;
          console.log("Error geocoding: " + err + ". Check quota at https://console.developers.google.com/google/maps-apis/apis/geocoding-backend.googleapis.com/quotas?project=pyeventmap&duration=PT1H ")
        } else if (err) {
          eventCallbackCount--;
          console.log("Error geocoding: " + err)
        }
      }.bind({
        date: date,
        time: time,
        title: title,
        description: description,
        location: location
      }));
    });
    eventCallbackCount = eventsFoundCount;
    console.log("Found " + eventsFoundCount + " events  on " + dateCount + " days")
    return;
  });
}

function parseINIString(data){
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/[\r\n]+/);
    var section = null;
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            return;
        }else if(regex.param.test(line)){
            var match = line.match(regex.param);
            if(section){
                value[section][match[1]] = match[2];
            }else{
                value[match[1]] = match[2];
            }
        }else if(regex.section.test(line)){
            var match = line.match(regex.section);
            value[match[1]] = {};
            section = match[1];
        }else if(line.length == 0 && section){
            section = null;
        };
    });
    return value;
}

String.prototype.insert = function(index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

function getMonthFromString(mon) {
  var d = new Date(Date.parse(mon + " 1, 2012")).getMonth() + 1;
  var s = d + '';
  while (s.length < 2) s = "0" + s;
  return s;
}

function mysql_real_escape_string(str) {
  //  Use | as delimiter between values,    ~  as delimiter between entries
  str = str.replace(/[\~\|]/g, ''); // TODO Test this 
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char; // prepends a backslash to backslash, percent,
        // and double/single quotes
    }
  });
}