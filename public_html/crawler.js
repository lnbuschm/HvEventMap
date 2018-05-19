// TUTORIAL AT http://www.netinstructions.com/how-to-make-a-simple-web-crawler-in-javascript-and-node-js/
// WEB DB PHP TUTORIAL https://www.sitepoint.com/publishing-mysql-data-web/
// SECURITY  https://security.stackexchange.com/questions/152590/how-to-securely-connect-to-a-database-with-php
// GOOGLE MAPS MARKERS -  https://developers.google.com/maps/documentation/javascript/examples/marker-remove
var request = require('request'); // for requesting HTML pages
var cheerio = require('cheerio'); // for grabbing fields from HTML
var URL = require('url-parse'); // not sure we use this ?
var mysql = require('mysql'); // database
var he = require('he'); // for decoding &amp and other chars from html
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyBR1wDAntcTEu-JnMcgTRKhaok46hdGD9o'
});

var DBNAME = "hveventdb";
var DBTABLE = "events";
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "hello123",
  database: DBNAME
});
var CLEAR_DB_ON_START = true;
var MAX_PAGES_TO_VISIT = 10;
var eventsFoundCount = 0;
var eventCallbackCount = -1;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to DB: " + DBNAME);
  if (CLEAR_DB_ON_START) clearEventDB();
});

crawlHvOne();
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/music/", 'music', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/food-drink/", 'food-drink', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/kids-family/", 'kids-family', MAX_PAGES_TO_VISIT);
//crawlHvOneCategory("https://calendar.hudsonvalleyone.com/events/category/arts-entertainment/", 'arts-entertainment', MAX_PAGES_TO_VISIT);

function clearEventDB() {
  var sql = "TRUNCATE TABLE " + DBTABLE + ";";
  console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Cleared table: " + DBTABLE);
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
  var sql = "INSERT INTO " + DBTABLE + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
  //console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
  });
  console.log("EVENTS LEFT TO PROCESS: " + eventCallbackCount + " OF " + eventsFoundCount);
  eventCallbackCount--;
  if (eventCallbackCount == 0) {
    console.log('--------------------------------');
    console.log("Done.  Exiting.");
    process.exit();
  }
}

var pageVisitCounter = 1;
function crawlHvOneCategory(PAGE_URL, CATEGORY_TYPE, VISITCOUNTER) {
  console.log("Visiting " + CATEGORY_TYPE + " page #" + VISITCOUNTER + ": " + PAGE_URL);

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
      if (VISITCOUNTER > 0) crawlHvOneCategory(nextpage, CATEGORY_TYPE, VISITCOUNTER-1);
      else console.log("VISITED " + MAX_PAGES_TO_VISIT + " " + CATEGORY_TYPE + " PAGES.... DONE.")
    });
  //  process.exit();
  });
  
  
}

function crawlHvOne() {
  var PAGE_URL = "https://calendar.hudsonvalleyone.com/browsable/";
  var url = new URL(PAGE_URL);
  var baseUrl = url.protocol + "//" + url.hostname;
  var divList = [];
  var dateList = [];
  // var today = new Date();
  // var dateToday = today.getFullYear()+''+(today.getMonth()+1)+today.getDate();
  // Make the request
  console.log("Visiting page " + url);
  if (url == undefined) {
    console.log("URL is undefined... error.  returning");
    return;
  }
  request(PAGE_URL, function(error, response, body) {
    console.log("Error is: " + error);
    // Check status code (200 is HTTP OK)
    console.log("Status code: " + response.statusCode);
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
String.prototype.insert = function(index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

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
