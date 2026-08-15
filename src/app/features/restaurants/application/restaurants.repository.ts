import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Restaurant } from '../domain/restaurant.model';

export interface RestaurantsRepository {
  list(): Observable<Restaurant[]>;
  saveAll(restaurants: readonly Restaurant[]): Observable<void>;
  upsert(restaurant: Restaurant): Observable<Restaurant>;
  suspend(id: string): Observable<Restaurant>;
}

export const RESTAURANTS_REPOSITORY = new InjectionToken<RestaurantsRepository>('RESTAURANTS_REPOSITORY');
