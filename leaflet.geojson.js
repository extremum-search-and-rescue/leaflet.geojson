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
            this.options.style = this.options.style || this.style;
            this.filter = this.options.filter || this.filter;
        }
        onAdd(map) {
            super.onAdd(map);
            if (this.afterInit)
                this.afterInit(map);
            this._map = map;
            const self = this;
            if (this.options.refreshIntervalSeconds) {
                const onDataRefreshTimeout = function () {
                    try {
                        self.refresh();
                    }
                    finally {
                        self._refreshIntervalId = setTimeout(onDataRefreshTimeout, self.options.refreshIntervalSeconds * 1000);
                    }
                };
                this._refreshIntervalId = setTimeout(onDataRefreshTimeout, self.options.refreshIntervalSeconds * 1000);
            }
            map.on('themechanged', this.redraw, this);
            this.refresh(true);
            return this;
        }
        onRemove(map) {
            var _a;
            clearInterval(this._refreshIntervalId);
            this.clearLayers();
            map.off('themechanged', this.redraw, this);
            super.onRemove(map);
            clearTimeout(this._refreshAbortTimeout);
            (_a = this._refreshCancellation) === null || _a === void 0 ? void 0 : _a.abort("AbortError: layer.remove");
            this._refreshCancellation = null;
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
            let url = L.Util.template(this._url, { s: this.options.subdomains });
            if (forcedRefresh || !this._refreshCancellation) {
                this.requestDataFromServer(url);
            }
        }
        requestDataFromServer(url) {
            const timeout = Math.min(Math.max(this.options.refreshIntervalSeconds - 1, 10), 60)
                * 1000;
            const self = this;
            this._refreshCancellation = new AbortController();
            this._refreshAbortTimeout = setTimeout(() => {
                if (!this || !this._refreshCancellation)
                    return;
                this._refreshCancellation.abort("AbortError: timeout in leaflet.geojson");
            }, timeout);
            fetch(url, {
                method: 'get',
                mode: 'cors',
                signal: this._refreshCancellation.signal,
                credentials: 'include',
                priority: 'low'
            }).then((response) => {
                clearTimeout(this._refreshAbortTimeout);
                this._refreshCancellation = null;
                if (!response || response.status !== 200)
                    return;
                response.json()
                    .then((geojson) => requestAnimationFrame(() => {
                    self.clearLayers();
                    self.addData(geojson);
                })).catch(err => console.log(err));
            }).catch(err => {
                if (!(err instanceof DOMException)) {
                    console.log(err);
                }
                clearTimeout(this._refreshAbortTimeout);
                this._refreshCancellation = null;
            });
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
//# sourceMappingURL=leaflet.geojson.js.map