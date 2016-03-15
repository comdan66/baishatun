/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 OA Wu Design
 */

function getUnit (will, now) { var addLat = will.lat () - now.lat (), addLng = will.lng () - now.lng (), aveAdd = ((Math.abs (addLat) + Math.abs (addLng)) / 2), unit = aveAdd < 10 ? aveAdd < 1 ? aveAdd < 0.1 ? aveAdd < 0.01 ? aveAdd < 0.001 ? aveAdd < 0.0001 ? 3 : 6 : 9 : 12 : 15 : 24 : 21, lat = addLat / unit, lng = addLng / unit; if (!((Math.abs (lat) > 0) || (Math.abs (lng) > 0))) return null; return { unit: unit, lat: lat, lng: lng }; }
function markerMove (marker, unitLat, unitLng, unitCount, unit, callback) {if (unit > unitCount) {marker.setPosition (new google.maps.LatLng (marker.getPosition ().lat () + unitLat, marker.getPosition ().lng () + unitLng));clearTimeout (window.markerMoveTimer);window.markerMoveTimer = setTimeout (function () {markerMove (marker, unitLat, unitLng, unitCount + 1, unit, callback);}, 25);} else { if (callback) callback (marker); }}
function markerGo (marker, will, callback) {var now = marker.getPosition ();var Unit = getUnit (will, now);if (!Unit) return false;markerMove (marker, Unit.lat, Unit.lng, 0, Unit.unit, callback);}
function mapMove (map, unitLat, unitLng, unitCount, unit, callback) {if (unit > unitCount) {map.setCenter (new google.maps.LatLng (map.getCenter ().lat () + unitLat, map.getCenter ().lng () + unitLng));clearTimeout (window.mapMoveTimer);window.mapMoveTimer = setTimeout (function () {mapMove (map, unitLat, unitLng, unitCount + 1, unit, callback);}, 25);} else {if (callback)callback (map);}}
function mapGo (map, will, callback) {var now = map.center;var Unit = getUnit (will, now);if (!Unit)return false;mapMove (map, Unit.lat, Unit.lng, 0, Unit.unit, callback);}

$(function () {
  var $body = $('body');
  $('#m, #c').click (function () { $body.toggleClass ('s'); });
  var $map = $('#mm');
  var $myPosition = $('#i');
  var $s = $('#s').click (function () {
    window.open ('https://www.facebook.com/sharer/sharer.php?u=' + window.location.href, '分享至臉書！', 'scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=550,height=420,top=100,left=' + (window.screen ? Math.round(screen.width / 2 - 275) : 100));
  });
  var _map = null;
  var _markers = [];
  var _myMarker = null;
  var _polyline = null;
  var _latlngs = 0;
  var _timer = null;
  var _isMove = false;
  var _v = 0;
  var _c = 0;
  var _cl = 50;
  var _url = 'http://dev.mazu.ioa.tw/api/baishatun/2/';
  var _url2 = 'http://dev.mazu.ioa.tw/api/baishatun/location/';
  var $length = $('#ll');

  function circlePath (r) { return 'M 0 0 m -' + r + ', 0 '+ 'a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 ' + 'a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';}
  function calculateLength (points) { var size = Math.pow (10, 2); if (google.maps.geometry.spherical) $length.text (Math.round (google.maps.geometry.spherical.computeLength (points) / 1000 * size) / size).addClass ('s'); }
  function myPositionPath (r) { return 'M 0 0 m -' + r + ', 0 '+ 'a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 ' + 'a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0' + 'M -' + (r + r / 2) + ' 0 L -' + (r / 2) + ' 0' + 'M 0 -' + (r + r / 2) + ' L 0 -' + (r / 2) + 'M ' + (r + r / 2) + ' 0 L ' + (r / 2) + ' 0' + 'M 0 ' + (r + r / 2) + ' L 0 ' + (r / 2); }

  function setLoation (a, n) {
    $.ajax ({
      url: _url2,
      data: { a: a, n: n },
      async: true, cache: false, dataType: 'json', type: 'POST',
    });
  }
  function initialize () {
    _map = new google.maps.Map ($map.get (0), {
      zoom: 16,
      zoomControl: true,
      scrollwheel: true,
      scaleControl: true,
      mapTypeControl: false,
      navigationControl: true,
      streetViewControl: false,
      disableDoubleClickZoom: true,
      center: new google.maps.LatLng (23.569396231491233, 120.3030703338623),
    });

    _map.mapTypes.set ('map_style', new google.maps.StyledMapType ([
      { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
    ]));
    _map.setMapTypeId ('map_style');

    google.maps.event.addListener (_map, 'zoom_changed', function () {
      clearTimeout (_timer);
      _timer = setTimeout (function () {
        $('img[src="img/mazu.png"]').parents ('.gmnoprint').css ({'opacity': 1});
      }, 500);
    });
    google.maps.event.addListener (_map, 'drag', function () {
      _isMove = true;
    });

    var reload = function () {
      var id = _latlngs.length ? _latlngs[_latlngs.length - 1].id : 0;

      $.when ($.ajax (_url + id + '?t=' + new Date ().getTime ())).done (function (result) {
        if (_c++ > _cl) return location.reload ();
        if (_v === 0) _v = result.v;
        if (_v != result.v) return location.reload ();
        if (!(result.s && result.p.length)) return ;

        _latlngs = result.p.map (function (t) {
          return {id: t.i, lat: t.a, lng: t.n, time: t.t};
        });

        _map.setCenter (new google.maps.LatLng (_latlngs[_latlngs.length - 1].lat, _latlngs[_latlngs.length - 1].lng));

        if (_markers.length)
          _markers[_markers.length - 1].setIcon ({
            path: circlePath (6), strokeColor: 'rgba(249, 39, 114, 1)', strokeWeight: 1, fillColor: 'rgba(249, 39, 114, .8)', fillOpacity: 0.5
          });

        _markers = _markers.concat (_latlngs.map (function (t, i) {
            if ((i % 5 === 0) && (i !== _latlngs.length - 1))
              new MarkerWithLabel ({
                position: new google.maps.LatLng (t.lat, t.lng),
                draggable: false,
                raiseOnDrag: true,
                map: _map,
                labelContent: '' + $.timeago (t.time),
                labelAnchor: new google.maps.Point (0, 0),
                labelClass: 'time',
                icon: {path: 'M 0 0'}
              });

            var marker = new google.maps.Marker ({
                map: _map,
                draggable: false,
                zIndex: t.id,
                optimized: false,
                position: new google.maps.LatLng (t.lat, t.lng),
                icon: i == _latlngs.length - 1 ? 'img/mazu.png' : {
                  path: circlePath (6),
                  strokeColor: 'rgba(249, 39, 114, .4)',
                  strokeWeight: 1,
                  fillColor: 'rgba(249, 39, 114, .5)',
                  fillOpacity: 0.5
                }
              });

            google.maps.event.addListener (marker, 'click', function (e) {
              console.error (t.id);
            });
            return marker;
        }));


        if (!_polyline)
          _polyline = new google.maps.Polyline ({ map: _map, strokeColor: 'rgba(249, 39, 114, .35)', strokeWeight: 5 });
        
        _polyline.setPath (_markers.map (function (t) { return t.position; }));
        if (!_isMove) mapGo (_map, new google.maps.LatLng (_latlngs[_latlngs.length - 1].lat, _latlngs[_latlngs.length - 1].lng));

        setTimeout (calculateLength.bind (this, _markers.map (function (t) { return t.position; })), 1800);
        $myPosition.addClass ('s').click (function () {
          $myPosition.text ('定位中.. 請稍候..');
          navigator.geolocation.getCurrentPosition (function (location) {
            $myPosition.text ('我的位置');

            if (!_myMarker) _myMarker = new google.maps.Marker ({ map: _map, draggable: false, optimized: false});
            _myMarker.setPosition (new google.maps.LatLng (location.coords.latitude, location.coords.longitude));
            _myMarker.setIcon ({path: myPositionPath (30), strokeColor: 'rgba(174, 129, 255, .8)', strokeWeight: 3, fillColor: 'rgba(174, 129, 255, .5)', fillOpacity: 0.2});
            _map.setCenter (new google.maps.LatLng (location.coords.latitude, location.coords.longitude));

            setLoation (location.coords.latitude, location.coords.longitude);

          }, function () {
            $myPosition.remove ();
          });
        });
      });
    };

    reload ();
    setInterval (reload, 30000);
  }

  google.maps.event.addDomListener (window, 'load', initialize);
});