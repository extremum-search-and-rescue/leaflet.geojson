var ImageCache = {};
var L;
(function (L) {
    class GeoJsonLayer extends L.GeoJSON {
        constructor(url, options) {
            super(null, options);
            this.options = {
                markersInheritOptions: false,
                pane: 'overlayPane',
                refreshIntervalSeconds: 60 * 30
            };
            this._url = url;
            L.Util.extend(this.options, options);
        }
        initialize(url, options) {
            this._url = url;
            super.initialize(null, options);
            L.Util.setOptions(this, this.options);
            this.options.onEachFeature = this.onEachFeature;
            this.options.style = this.style;
            this.options.filter = this.filter;
        }
        onAdd(map) {
            super.onAdd(map);
            if (this.afterInit)
                this.afterInit(map);
            this._map = map;
            const self = this;
            if (this.options.refreshIntervalSeconds) {
                this._refreshIntervalId = setInterval(function () { self.refresh(); }, this.options.refreshIntervalSeconds * 1000);
            }
            map.on('themechanged', this.redraw, this);
            this.refresh();
            return this;
        }
        onRemove(map) {
            clearInterval(this._refreshIntervalId);
            this.clearLayers();
            map.off('themechanged', this.redraw, this);
            super.onRemove(map);
            this._map = null;
            return this;
        }
        style(feature) {
            return {};
        }
        filter(feature) {
            return true;
        }
        onEachFeature(feature, layer) {
            return {};
        }
        redraw() {
            const keys = Object.keys(this._layers);
            if (keys.length > 0) {
                const renderer = this._map.getRenderer(this._layers[keys[0]]);
                setTimeout(() => renderer._update(), 0);
            }
            return this;
        }
        refresh() {
            if (!this._map)
                return;
            if (!this._map.hasLayer(this))
                return;
            setTimeout(() => this.requestDataFromServer(this._url), 0);
        }
        requestDataFromServer(url) {
            const self = this;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open('GET', url, true);
            xmlhttp.withCredentials = true;
            xmlhttp.send();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    try {
                        var geojson = JSON.parse(xmlhttp.responseText);
                        self.clearLayers();
                        self.addData(geojson);
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
            };
        }
        addData(geojson) {
            var features = Array.isArray(geojson) ? geojson : geojson.features, i, len, feature;
            if (features) {
                for (i = 0, len = features.length; i < len; i++) {
                    feature = features[i];
                    if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                        this.addData(feature);
                    }
                }
                return this;
            }
            var options = this.options;
            if (options.filter && !options.filter(geojson)) {
                return this;
            }
            var layer = this.geometryToLayer(geojson, options);
            if (!layer) {
                return this;
            }
            layer.feature = L.GeoJSON.asFeature(geojson);
            layer.defaultOptions = layer.options;
            this.resetStyle(layer);
            if (options.onEachFeature) {
                options.onEachFeature(geojson, layer);
            }
            return this.addLayer(layer);
        }
        geometryToLayer(geojson, options) {
            var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson, coords = geometry ? geometry.coordinates : null, layers = [], _coordsToLatLng = options && options.coordsToLatLng || GeoJsonLayer.coordsToLatLng, latlng, latlngs, i, len;
            if (!coords && !geometry) {
                return null;
            }
            switch (geometry.type) {
                case 'Point':
                    latlng = _coordsToLatLng(coords);
                    return this.pointToLayer(geojson, latlng);
                case 'MultiPoint':
                    for (i = 0, len = coords.length; i < len; i++) {
                        latlng = _coordsToLatLng(coords[i]);
                        layers.push(this.pointToLayer(geojson, latlng));
                    }
                    return new L.FeatureGroup(layers);
                case 'LineString':
                case 'MultiLineString':
                    latlngs = L.GeoJSON.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
                    return new L.Polyline(latlngs, options);
                case 'Polygon':
                case 'MultiPolygon':
                    latlngs = L.GeoJSON.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
                    return new L.Polygon(latlngs, options);
                case 'GeometryCollection':
                    for (i = 0, len = geometry.geometries.length; i < len; i++) {
                        var geoLayer = this.geometryToLayer({
                            geometry: geometry.geometries[i],
                            type: 'Feature',
                            properties: geojson.properties
                        }, options);
                        if (geoLayer) {
                            layers.push(geoLayer);
                        }
                    }
                    return new L.FeatureGroup(layers);
                case 'FeatureCollection':
                    for (i = 0, len = geometry.features.length; i < len; i++) {
                        var featureLayer = this.geometryToLayer(geometry.features[i], options);
                        if (featureLayer) {
                            layers.push(featureLayer);
                        }
                    }
                    return new L.FeatureGroup(layers);
                default:
                    throw new Error('Invalid GeoJSON object.');
            }
        }
    }
    L.GeoJsonLayer = GeoJsonLayer;
})(L || (L = {}));
