#!/usr/bin/python3

#import urllib2
import urllib3
import re

#import pygmaps
import webbrowser
import argparse

import googlemaps
from datetime import datetime

from lxml import html
import requests

parser = argparse.ArgumentParser(description='Read date.')
#parser.add_argument('--date', type=str, required=True,
#                    help='a date to create a map event for')
parser.add_argument("date", type=str, help="date in format 20181225")

#parser.add_argument('--foo', help='foo of the %(prog)s program')
args = parser.parse_args()

url = "https://calendar.hudsonvalleyone.com/browsable/"
#req = urllib2.Request(url, headers={'User-Agent' : "Magic Browser"}) 
#con = urllib2.urlopen( req )#
#req = urllib3.Request(url, headers={'User-Agent' : "Magic Browser"}) 
#con = urllib3.urlopen( req )
#print con.read()
#hvcalendar = con.read()

#DATE="20180507"
DATE=args.date
eventDict = { } 
eventDict[DATE] = { }

#url = 'http://worldagnetwork.com/'
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'}
#print(result.content.decode())

page = requests.get('https://calendar.hudsonvalleyone.com/browsable/')
page = requests.get(url, headers=headers)


tree = html.fromstring(page.content)
events = ''.join(tree.xpath('//div[@class="'+DATE+'"]//text()'))

#events = tree.xpath('//div[@class="20180508"]/text()')

tree = html.fromstring('<body><div class="number">76</div></body>')
number = tree.xpath('//div[@class="number"]/text()')[0]
#print(number)

#print events
#print (events)
#eventsL = re.split(' am|, pm',events)
#for e in eventsL:
#  print ("NExt elemtn:")
#  print e

htmlstring = """<!DOCTYPE html>
<html>
 <head>
    <title>HV Event Map for """ + DATE + """ </title>
    <meta name="viewport" content="initial-scale=1.0">
    <meta charset="utf-8">
    <style>
      /* Always set the map height explicitly to define the size of the div
       * element that contains the map. */
      #map {
        height: 100%;
      }
      /* Optional: Makes the sample page fill the window. */
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      function initMap() {
        var homeLatLng = {lat: 41.751293, lng: -74.0857193};
        // Create a map object and specify the DOM element
        // for display.
        var map = new google.maps.Map(document.getElementById('map'), {
          center: homeLatLng,
          zoom: 10
        });
        """

# Geocoding an address
gmaps = googlemaps.Client(key='AIzaSyBR1wDAntcTEu-JnMcgTRKhaok46hdGD9o')

content = page.content
#eventsL = re.split('<div class=20180506>',content)
#eventsL = content.split("<div class=20180506>")
eventsL = str(content).split(DATE)
print("DATE IS " , DATE)
skipcount = 4
count = 0
done = 0
#print(page.content)
for eventline in eventsL:
  

  events = [ "", ""] 
  count = count + 1
  if (count < skipcount): continue
  if str(int(DATE)+1) in eventline:
  	pos = eventline.find(str((int(DATE)+1)))
  	eventline = eventline[:eventline.find(str((int(DATE)+1)))]
  #	print("LAST EVENTLINE: ", eventline)
  	done = 1
  #	events[0] = eventline
  #	break
 # print ("NExt elemtn:  %d", count)
 # print (eventline)
  #if "<strong>" in  eventline[eventline.index("</strong>"):eventline.index("\\n")].strip("</strong>").strip("\\"):
  #print("COUNT IS: ",eventline.count("<strong>") )
  if eventline.count("<strong>") > 1:
   # print(" HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHh           ")
    events[0] = eventline[:eventline.find("</p></div><div class=><p>")]
    events[1] = eventline[eventline.find("</p></div><div class=><p>"):]
   # print("POKSD")
#    events[1] = eventline[eventline.index("</strong>"):eventline.index("\\n")].strip("</strong>").strip("\\") 
  else:
  #  print("EVENTLINE:   ",eventline)
    events[0] = eventline
  #  print(" WE ARE HERE              ")

  for e in events:
	  if e is "": continue
	 # print("---------------------------------")
	 # print(" E LINE !!   ", e )
	  time = e[e.find("><p>")+1:e.find("<strong>")]
	  time = time.strip("<p>")
	 # print ("TIME", time)
	#  2018-05-07/">
	#  print(DATE[0:4]+"-"+DATE[4:6]+"-"+DATE[6:8]+"/\">")
	#  title = e[e.find(DATE[0:4]+"-"+DATE[4:6]+"-"+DATE[6:8]+"/\">"):e.find("</a>")]
	#  title = title.strip(DATE[0:4]+"-"+DATE[4:6]+"-"+DATE[6:8]+"/\">")

	  title = e[e.find("/\">"):e.find("</a>")]
	  title = title.lstrip("/\">")

	 # print("TITLE",title)

	#  location = e[e.rindex('\\n'):]
	  location = e[e.rfind("\\n"):e.rfind("</p></div>")]
	  location = location.strip("\\n").strip(".")
	#  print("LOCATION",location)

	  description = e[e.index("</strong>"):e.index("\\n")]
	  description = description.strip("</strong>").strip("\\")

	#  print("DESCRIPTION",description)
	  eventDict[DATE][str(count)] = {'TIME': time, 'TITLE': title, 'LOCATION': location, 'DESCRIPTION': description}
 # if str(int(DATE)+1) in eventline: break
  if done: break
 # print(" ssssssssssssssssssssssssssssssssssssssssssss           ")
PRINTDICT=1
for date, value in eventDict.items():
  for ecount, edict in value.items():
    geocode_result = gmaps.geocode(edict['LOCATION']+", NY")

    if (PRINTDICT):
	    print("---------------------------------")
	    #print("COUNT",int(ecount))
	    print ("TIME", edict['TIME'])
	    print("TITLE",edict['TITLE'])
	    print("DESCRIPTION",edict['DESCRIPTION'])
	    print("LOCATION",edict['LOCATION'])
	    print("LAT,LNG: ",geocode_result[0]["geometry"]['location']['lat'],geocode_result[0]["geometry"]['location']['lng'])
	    #print("LAT: ", geocode_result[0]["geometry"]['location']['lat'])
	    #print("LNG: ", geocode_result[0]["geometry"]['location']['lng'])
    print("---------------------------------")
    htmlstring += """var myLatLng%d = {lat: %f, lng: %f};

        var marker%d = new google.maps.Marker({
          map: map,
          position: myLatLng%d,
          title: '%s'
        });
        var contentString%d = '<div id="content">'+
            '<div id="siteNotice">'+
            '</div>'+
            '<h1 id="firstHeading" class="firstHeading">(%s) %s</h1>'+
            '<div id="bodyContent">'+
            '<p>%s</p>'+
            '<p><b>%s</b></p>'+
            '</div>'+
            '</div>';

        var infowindow%d = new google.maps.InfoWindow({
          content: contentString%d
        });
        var opened%d = false;
        marker%d.addListener('click', function() {
	      if (opened%d) { infowindow%d.close(map, marker%d);  opened%d=false; }
	      else { infowindow%d.open(map, marker%d); opened%d=true; }
        });
        """ % (int(ecount),geocode_result[0]["geometry"]['location']['lat'],  geocode_result[0]["geometry"]['location']['lng'],int(ecount),int(ecount), edict['TITLE'], int(ecount), edict['TIME'].strip(' '), edict['TITLE'], edict['DESCRIPTION'], edict['LOCATION'], int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount), int(ecount) )
#from geopy import geocoders


#import json
#geocode_result = gmaps.geocode('1600 Amphitheatre Parkway, Mountain View, CA')
#print(geocode_result)
#parsed = json.loads(geocode_result)
#print (json.dumps(parsed, indent=4, sort_keys=True))

htmlstring = htmlstring  + """       }

    </script>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBR1wDAntcTEu-JnMcgTRKhaok46hdGD9o&callback=initMap"
        async defer></script>
  </body>
</html>
"""

f = open('/home/luke/Documents/hvevents.html','w')
f.write(htmlstring)
f.close()

print("DONE")