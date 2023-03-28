var ImageCache = {};
var L;
(function (L) {
    class GeoJsonLayer extends L.GeoJSON {
        constructor(url, options) {
            options = Object.assign({
                id: null,
                markersInheritOptions: false,
                pane: 'overlayPane',
                refreshIntervalSeconds: 60 * 30,
                onEachFeature: null
            }, options);
            super(null, options);
            this._url = url;
        }
        initialize(url, options) {
            this._url = url;
            super.initialize(null, options);
            L.Util.setOptions(this, this.options);
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
            this.refresh(true);
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
        redraw() {
            const keys = Object.keys(this._layers);
            if (keys.length > 0) {
                const renderer = this._map.getRenderer(this._layers[keys[0]]);
                setTimeout(() => renderer._update(), 0);
            }
            return this;
        }
        refresh(forcedRefresh) {
            if (!this._map)
                return;
            if (!this._map.hasLayer(this))
                return;
            if (!forcedRefresh && document.hidden)
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
                        requestAnimationFrame(() => {
                            self.clearLayers();
                            self.addData(geojson);
                        });
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
                options.onEachFeature(geojson, layer, this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZmxldC5nZW9qc29uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGVhZmxldC5nZW9qc29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksVUFBVSxHQUF5QyxFQUFFLENBQUM7QUFFMUQsSUFBVSxDQUFDLENBcU5WO0FBck5ELFdBQVUsQ0FBQztJQXNCVixNQUFzQixZQUFzQixTQUFRLENBQUMsQ0FBQyxPQUFVO1FBUS9ELFlBQVksR0FBVyxFQUFFLE9BQTRCO1lBQ3BELE9BQU8saUJBQVE7Z0JBQ2IsRUFBRSxFQUFFLElBQUk7Z0JBQ1IscUJBQXFCLEVBQUUsS0FBSztnQkFDNUIsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLHNCQUFzQixFQUFFLEVBQUUsR0FBRyxFQUFFO2dCQUMvQixhQUFhLEVBQUUsSUFBSTthQUNuQixFQUFLLE9BQU8sQ0FDYixDQUFDO1lBQ0YsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNqQixDQUFDO1FBRVEsVUFBVSxDQUFDLEdBQVEsRUFBRSxPQUE4QjtZQUMzRCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQWEsQ0FBQztZQUMxQixLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNuQyxDQUFDO1FBQ1EsS0FBSyxDQUFDLEdBQVU7WUFDeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixJQUFJLElBQUksQ0FBQyxTQUFTO2dC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