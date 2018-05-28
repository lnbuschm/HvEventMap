<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html,
    body {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    #toprow {
      width: 100%;
      height: 10%;
      text-align: center;
      font-size: 0.9em;
            margin: 0;
      padding: 0;
    }

    table,
    th,
    td {
      border: 1px solid black;
      border-collapse: collapse;
      height: 100%;
    }

    .superscript {
      color: red;
      display: block;
      position: relative;
      /*left:2px; 
        top: -5px*/
      bottom: 0.3em;
      color: red;
      font-size: 0.6em;
    }

    #map {
      height: 90%;
    }

    .infowindow {
      width:240px;
      height:180px;
    }

    #hide {
      visibility: hidden;
      display: none;
      opacity: 0;
    }

  </style>
  <title>Hudson Valley Event Map</title>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
  <script>
    var markers = [];
    var infowindows = [];
    // Removes the markers from the map, but keeps them in the array.
    function clearMarkers() {
      setMapOnAll(null);
    }
    // Sets the map on all markers in the array.
    function setMapOnAll(map) {
      for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
      }
    }
    // Shows any markers currently in the array.
    function showMarkers() {
      setMapOnAll(map);
    }
    // Deletes all markers in the array by removing references to them.
    function deleteMarkers() {
      clearMarkers();
      markers = [];
    }
    var musicIcon = 'icons/music-32.png'; // https://icon-icons.com/icons2/643/PNG/32/music-note-circle-shape-brand_icon-icons.com_59304.png'; 
    var foodIcon = 'icons/food-32.png';
    function loadMap(date) {
      var dateElements = document.querySelectorAll('.d' + date);
      var dateElementsTextArr = [];
      clearMarkers();
      markerCount = 0;
      for (var i = 0; i < dateElements.length; i++) {
        //  Use | as delimiter between values,    ~  as delimiter between entries
        //   console.log('dateElements[i]: ', dateElements[i].innerText);
        //     dateElementsTextArr[i] = dateElements[i].innerText.split('~');
        var allEventsOnDate = dateElements[i].innerText.split('~');
        //   console.log('allEventsOnDate: ', allEventsOnDate);
        for (var j = 0; j < allEventsOnDate.length; j++) {
          var elems = allEventsOnDate[j].toString().split('|');
          if (elems == "") break; // last element is blank
          var time = elems[0];
          var title = elems[1];
          var description = elems[2];
          var location = elems[3];
          var lat = parseFloat(elems[4]);
          var lng = parseFloat(elems[5]);
          var type = elems[6];
          var icon = '';
          if (type == 'music') icon = musicIcon;
          //else if (type == 'food-drink') icon = foodIcon;  // food category isn't so great
          markers[markerCount] = new google.maps.Marker({
            map: map,
            position: {
              lat: lat,
              lng: lng
            },
            icon: icon,
            title: title
          }); 
          
          var contentString = '<div class="infowindow"><h2>' + title + '</br>(' + time +')</h2><p><b>' + location + '</b></p><p>' + description + '</p></div>';
          infowindows[markerCount] = new google.maps.InfoWindow({
            content: contentString // description
          });

          markers[markerCount].addListener('click', function(markerCount) {
            if (infowindows[this.markerCount].getMap()) {
              infowindows[this.markerCount].close(map, markers[this.markerCount]);
            } else {
              // close all other open windows
              for (var i = 0; i < infowindows.length; i++) {
                infowindows[i].close(map, markers[i]);
              }
              infowindows[this.markerCount].open(map, markers[this.markerCount]);
            }
          }.bind({
            markerCount: markerCount
          }));
          markerCount++;
        }
      }
    }
  </script>
</head>

<body>
  <?php 
      ini_set('display_errors', 'On'); 
      error_reporting(E_ALL);
      if (!function_exists('mysqli_init') && !extension_loaded('mysqli')) {
          exit("Server Error: MYSQLI not found.  Please install");
      }
      $dateArray = [];
      $dbdata = [];
      // Need to run  "php -S localhost:8000"  from terminal to support php
      $inicfg = parse_ini_file("../db.ini");

      // Create connection
      $conn = new mysqli($inicfg['servername'], $inicfg['username'], $inicfg['password'], $inicfg['db']);
      // Check connection
      if ($conn->connect_error) {
          die("Connection failed: " . $conn->connect_error);
      } 
      $conn->set_charset("utf8");

      $sql = "SELECT * FROM " . $inicfg['table'];
      $result = $conn->query($sql);

      if ($result->num_rows > 0) {
          while($row = $result->fetch_assoc()) {
            array_push($dbdata,$row);
            if(!in_array($row['date'], $dateArray)){
              array_push($dateArray,$row['date']);
              }
          }
            usort($dateArray, "date_sort");
      } 
      function date_sort($a, $b) {
        return strtotime($a) - strtotime($b);
      }
      ?>
    <div id="toprow">
      <table style="width:100%">
        <tr>
          <?php
            //  With too many buttons showing, the google map does not zoom and move correctly
            $MAX_BUTTONS_TO_SHOW = 7;
            $today = date("Y-m-d");  

            foreach ($dateArray as $index => $date) {
              if (date_sort($today, $date) > 0) continue;
              $dateArr = explode('-', $date);
              $shortdate = $dateArr[1]."/".$dateArr[2];
              $timestamp = strtotime($date);
              $day = date('D', $timestamp);
              if ($date == $today) {
                echo '<th class="dateselect" id="s'.$date.'">'.$shortdate.'</br>'.$day.'<div class="superscript">(Today)</div></th>';
//                echo '<th class="dateselect" id="s'.$date.'">'.$shortdate.' <sub>'.$day.'</sub><div class="superscript">(Today)</div></th>';
//                echo '<th class="dateselect" id="s'.$date.'">'.$date.' <sub>'.$day.' (Today)</sub></th>';
//                echo '<th class="dateselect" id="s'.$date.'" bgcolor="LightGray">'.$date.' <sub>'.$day.'</sub></th>';
              }
              else if ($index < $MAX_BUTTONS_TO_SHOW) {
                echo '<th class="dateselect" id="s'.$date.'">'.$shortdate.'</br>'.$day.'</th>';
//                echo '<th class="dateselect" id="s'.$date.'">'.$shortdate.'<sub> '.$day.'</sub></th>';
//                echo '<th class="dateselect" id="s'.$date.'">'.$shortdate.'<sub> '.$day.'</sub></th>';
              }
            }

            ?>
            <script>

              var datebtns = document.getElementsByClassName("dateselect");
              Array.prototype.forEach.call(datebtns, function(datebtn) {
                datebtn.addEventListener("click", function(dateclicked) {
                    Array.prototype.forEach.call(datebtns, function(datebtn) {
                      datebtn.style.backgroundColor = "white";  // reset all bgcolors to white
                    })
                    document.getElementById("s" + this.dateclicked).style.backgroundColor = "lime";
                    loadMap(this.dateclicked);
                  }.bind({
                    dateclicked: datebtn.id.slice(1) // datebtn.textContent.split(' ')[0]
                  })
                )
              });
            </script>
        </tr>
      </table>
    </div>
    <div id="map"></div>
    <script>
      var map;
      var today = function() { var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();
        if(dd<10) dd = '0'+dd
        if(mm<10) mm = '0'+mm
        return yyyy + '-' + mm + '-' + dd;
      }
      function initMap() {
        // Create a map object and specify the DOM element for display.
        map = new google.maps.Map(document.getElementById('map'), {
          center: {
            lat: 41.739100,
            lng: -74.050323
          },
          zoom: 10,
          gestureHandling: 'greedy',
          disableDefaultUI: true,
          mapTypeControl: false
        });
        loadMap(today());
        document.getElementById('s'+today()).click();
      }

    </script>
    <div id="hide">
      <?php
        if (count($dbdata) > 0) {
            // output data of each row
            $prevdate = '';
            foreach($dbdata as $row) {
              if ($prevdate == '') { echo '<div class="d'.$row['date'].'">'; }
              else if ($prevdate != $row['date']) {
                echo '"</div>'.'<div class="d'.$row['date'].'">';
              }
              //  Use | as delimiter between values,    ~  as delimiter between entries
                echo $row['time'].'|'.$row['title'].'|'.$row['description'].'|'.$row['location'].'|'.$row['lat'].'|'.$row['lng'].'|'.$row['type'].'~';
              $prevdate = $row['date'];
            }
            echo '</div>';
        } 
        ?>
    </div>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyB_WHjYvTLQwOcmvb30qbkwp1jO-xPVySk&callback=initMap" async defer></script>
</body>

</html>