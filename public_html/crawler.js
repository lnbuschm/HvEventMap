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

var DBNAME = "events" // hveventdb
var MAX_PAGES_TO_VISIT = 10;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "hello123",
  database: DBNAME
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to DB: " + DBNAME);
  clearEventDB();
});

crawlHvOne();

function clearEventDB() {
  var sql = "TRUNCATE TABLE " + DBNAME + ";";
  console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Cleared Databse: " + DBNAME);
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
  var sql = "INSERT INTO " + DBNAME + " (date, time, title, description, location, lat, lng) VALUES ('" + mysql_real_escape_string(date) + "', '" + mysql_real_escape_string(time) + "', '" + mysql_real_escape_string(title) + "', '" + mysql_real_escape_string(description) + "', '" + mysql_real_escape_string(location) + "', " + lat + ", " + lng + ");";
  console.log("SQL: " + sql);
  con.query(sql, function(err, result) {
    if (err) throw err;
    //  console.log("1 record inserted");
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
    var eventCount = 0;
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
      eventCount++;
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
          console.log("Error geocoding: " + err + " Check quota at https://console.developers.google.com/google/maps-apis/apis/geocoding-backend.googleapis.com/quotas?project=pyeventmap&duration=PT1H ")
        } else if (err) {
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
    console.log("Found " + eventCount + " events  on " + dateCount + " days")
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
//  process.exit();