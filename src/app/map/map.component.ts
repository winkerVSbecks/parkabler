import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { SpotApiService } from '../shared/spotapi.service';
import { GeolocationService, Position } from '../shared/geolocation.service';

@Component({
  selector: 'main-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('googleMapsDiv') googleMapsDiv;
  map: any;

  constructor(
    private spotApi: SpotApiService,
    private geolocation: GeolocationService
  ) {}

  ngOnInit() {}

  addSpots(): void {
    // Add spots to map from the spotApi
    this.spotApi.spots.forEach((spot) => {
      new window.google.maps.Marker({
        position: spot,
        map: this.map
      });
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  initializeMap(): void {
    // initialize google map div
    let mapDiv = this.googleMapsDiv.nativeElement;
    this.map = new window.google.maps.Map(mapDiv, { zoom: 15 });

    // setup listener for map location updates
    this.geolocation.mapLocation.subscribe((position: Position) => {
      this.map.setCenter(position);
      this.addSpots();
    });

    // set the current location as maplocation
    this.geolocation.currentLocation()
      .then((p: Position) => {
        this.geolocation.mapLocation.set(p);
      });
  }

}
