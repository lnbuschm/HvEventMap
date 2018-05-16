<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Always set the map height explicitly to define the size of the div
      * element that contains the map. */

    #map {
      height: 100%;
    }

    /* Optional: Makes the sample page fill the window. */

    html,
    body {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .toprow {
      width: 100%;
      height: 10%;
      text-align: center;
    }

    /* Create two equal columns that floats next to each other */

    .column {
      float: left;
      width: 50%;
      padding: 10px;
    }

    .left {
      width: 25%;
    }

    .right {
      width: 75%;
    }

    /* Clear floats after the columns */

    .row:after {
      content: "";
      display: table;
      clear: both;
    }

    /* Responsive layout - makes the two columns stack on top of each other instead of next to each other */

    @media screen and (max-width: 600px) {
      .column {
        width: 100%;
      }
    }

    #hide {
      visibility: hidden;
      display: none;
      opacity: 0;
    }

    table,
    th,
    td {
      border: 1px solid black;
      border-collapse: collapse;
    }

    .superscript {
      color: red;
      display: block;
      position: relative;
      /*left:2px; 
        top: -5px*/
      bottom: 0.5em;
      color: red;
      font-size: 0.8em;
    }
  </style>
  <title>Hudson Valley Event Map</title>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
  <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
  <script type="text/javascript" src="date.js"></script>
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

    function loadMap(date) {
      var dateElements = document.querySelectorAll('.d' + date);
      var dateElementsTextArr = [];
      clearMarkers();
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
          //          markers[j] = new google.maps.Marker({
          markers[j] = new google.maps.Marker({
            map: map,
            position: {
              lat: lat,
              lng: lng
            },
            title: title
          });
          var contentString = '<h1>(' + time + ') ' + title + '</h1><p>' + description + '</p><p><b>' + location + '</b></p>';
          infowindows[j] = new google.maps.InfoWindow({
            content: contentString // description
          });
          markers[j].addListener('click', function(j) {
            if (infowindows[this.j].getMap()) {
              infowindows[this.j].close(map, markers[this.j]);
            } else {
              infowindows[this.j].open(map, markers[this.j]);
            }
          }.bind({
            j: j
          }));
        }
      }
    }
  </script>
</head>

<body>
  <?php
      if (!function_exists('mysqli_init') && !extension_loaded('mysqli')) {
          //echo 'We don\'t have mysqli!!!';
          exit("NO MYSQLI");
      }
      $dateArray = [];
      $dbdata = [];
      // Need to run  "php -S localhost:8000"  from terminal to support php
      $servername = "localhost";
      $username = "webuser";
      $password = "webpass";
      $dbname = "events";
      
      // Create connection
      $conn = new mysqli($servername, $username, $password, $dbname);
      // Check connection
      //echo "PHP STARTING"; 
      if ($conn->connect_error) {
          die("Connection failed: " . $conn->connect_error);
      } 
      $conn->set_charset("utf8");

      $sql = "SELECT * FROM " . $dbname;
      $result = $conn->query($sql);

      if ($result->num_rows > 0) {
          while($row = $result->fetch_assoc()) {
            array_push($dbdata,$row);
            if(!in_array($row['date'], $dateArray)){
              array_push($dateArray,$row['date']);
              }

          }
      } 
      ?>
    <div id="toprow">
      <table style="width:100%">
        <tr>
          <?php
            //  With too many buttons showing, the google map does not zoom and move correctly
            $MAX_BUTTONS_TO_SHOW = 3;
            $today = date("Y-m-d");
            foreach ($dateArray as $index => $date) {
              $timestamp = strtotime($date);
              $day = date('D', $timestamp);
              if ($date == $today) {
                echo '<th class="dateselect" id="s'.$date.'">'.$date.' <sub>TODAY'.$day.'</sub><div class="superscript">(Today)</div></th>';
//                echo '<th class="dateselect" id="s'.$date.'">'.$date.' <sub>'.$day.' (Today)</sub></th>';
//                echo '<th class="dateselect" id="s'.$date.'" bgcolor="LightGray">'.$date.' <sub>'.$day.'</sub></th>';
              }
              else if ($index < $MAX_BUTTONS_TO_SHOW) {
                echo '<th class="dateselect" id="s'.$date.'">'.$date.'<sub> '.$day.'</sub></th>';
              }
            }

            ?>
            <script>
              var datebtns = document.getElementsByClassName("dateselect");
              Array.prototype.forEach.call(datebtns, function(datebtn) {
                datebtn.addEventListener("click", function(dateclicked) {
                    // alert("Clicked " + this.dateclicked);
                    // reset all bgcolors to white
                    Array.prototype.forEach.call(datebtns, function(datebtn) {
                      datebtn.style.backgroundColor = "white";
                    })
                    document.getElementById("s" + this.dateclicked).style.backgroundColor = "lime";
                    loadMap(this.dateclicked);
                    // alert("Clicked" + this.dateclicked);
                  }.bind({
                    dateclicked: datebtn.textContent.split(' ')[0]
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

      function initMap() {
        var homeLatLng = {
          lat: 41.751293,
          lng: -74.0857193
        };
        // Create a map object and specify the DOM element
        // for display.
        map = new google.maps.Map(document.getElementById('map'), {
          center: homeLatLng,
          zoom: 10
        });
      }
    </script>
    <div id="hide">
      <?php
        if (count($dbdata) > 0) {
            // output data of each row
            $prevdate = '';
            foreach($dbdata as $row) {
            //while($row = $result->fetch_assoc()) {
              if ($prevdate == '') { echo '<div class="d'.$row['date'].'">'; }
              else if ($prevdate != $row['date']) {
                echo '"</div>'.'<div class="d'.$row['date'].'">';
              }
              //  Use | as delimiter between values,    ~  as delimiter between entries
                echo $row['time'].'|'.$row['title'].'|'.$row['description'].'|'.$row['location'].'|'.$row['lat'].'|'.$row['lng'].'~';
              $prevdate = $row['date'];
            }
            echo '</div>';
        } 
        ?>
    </div>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBR1wDAntcTEu-JnMcgTRKhaok46hdGD9o&callback=initMap" async defer></script>
</body>

</html>