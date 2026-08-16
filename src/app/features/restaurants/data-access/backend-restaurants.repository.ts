import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { RestaurantsRepository } from '../application/restaurants.repository';
import { Restaurant } from '../domain/restaurant.model';

interface BackendRestaurantDto {
  id: string;
  name: string;
  registrationNumber: string;
  ownerId: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  paymentEligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'SUSPENDED';
  ownerTemporaryPassword?: string;
}

interface CreateRestaurantDto {
  name: string;
  registrationNumber: string;
  ownerUserId?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhoneNumber: string;
  ownerEmail?: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

interface UpdateRestaurantDto {
  name: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

@Injectable({ providedIn: 'root' })
export class BackendRestaurantsRepository implements RestaurantsRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<Restaurant[]> {
    return this.api.get<BackendRestaurantDto[]>('restaurants').pipe(
      map(restaurants => restaurants.map(restaurant => this.toDomain(restaurant))),
    );
  }

  saveAll(restaurants: readonly Restaurant[]): Observable<void> {
    if (restaurants.some(restaurant => !this.hasBackendCreateContract(restaurant))) {
      return throwError(() => new Error(
        'L’import backend exige registrationNumber, ownerId, téléphone et adresse structurée pour chaque restaurant.',
      ));
    }

    return forkJoin(restaurants.map(restaurant => this.upsert(restaurant))).pipe(map(() => undefined));
  }

  upsert(restaurant: Restaurant): Observable<Restaurant> {
    if (restaurant.source === 'backend') {
      return this.api.put<BackendRestaurantDto, UpdateRestaurantDto>(
        `restaurants/${encodeURIComponent(restaurant.id)}`,
        this.toUpdateDto(restaurant),
      ).pipe(map(response => this.toDomain(response)));
    }

    if (!this.hasBackendCreateContract(restaurant)) {
      return throwError(() => new Error(
        'Le restaurant doit avoir un NINEA, un propriétaire backend, un téléphone et une adresse structurée.',
      ));
    }

    return this.api.post<BackendRestaurantDto, CreateRestaurantDto>(
      'restaurants',
      this.toCreateDto(restaurant),
    ).pipe(map(response => this.toDomain(response)));
  }

  suspend(id: string): Observable<Restaurant> {
    return this.api.patch<BackendRestaurantDto, Record<string, never>>(
      `restaurants/${encodeURIComponent(id)}/suspend`,
      {},
    ).pipe(map(response => this.toDomain(response)));
  }

  private toDomain(dto: BackendRestaurantDto): Restaurant {
    const address = [dto.street, dto.district, dto.city, dto.country]
      .filter(Boolean)
      .join(', ');

    return {
      id: dto.id,
      name: dto.name,
      address,
      phone: dto.phoneNumber,
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: '',
      status: this.toDisplayStatus(dto.status),
      registrationNumber: dto.registrationNumber,
      ownerId: dto.ownerId,
      country: dto.country,
      city: dto.city,
      district: dto.district,
      street: dto.street,
      paymentEligibilityStatus: dto.paymentEligibilityStatus,
      ownerTemporaryPassword: dto.ownerTemporaryPassword,
      source: 'backend',
    };
  }

  private toCreateDto(restaurant: Restaurant): CreateRestaurantDto {
    return {
      name: restaurant.name,
      registrationNumber: restaurant.registrationNumber!,
      ...(restaurant.ownerId?.trim() ? { ownerUserId: restaurant.ownerId.trim() } : {}),
      ownerFirstName: restaurant.ownerFirstName ?? '',
      ownerLastName: restaurant.ownerLastName ?? '',
      ownerPhoneNumber: normalizePhone(restaurant.ownerPhoneNumber ?? ''),
      ownerEmail: restaurant.ownerEmail?.trim() || undefined,
      phoneNumber: normalizePhone(restaurant.phone!),
      country: restaurant.country!,
      city: restaurant.city!,
      district: restaurant.district ?? '',
      street: restaurant.street!,
    };
  }

  private toUpdateDto(restaurant: Restaurant): UpdateRestaurantDto {
    return {
      name: restaurant.name,
      phoneNumber: normalizePhone(restaurant.phone ?? ''),
      country: restaurant.country ?? '',
      city: restaurant.city ?? '',
      district: restaurant.district ?? '',
      street: restaurant.street ?? '',
    };
  }

  private hasBackendCreateContract(restaurant: Restaurant): boolean {
    const hasExistingOwner = !!restaurant.ownerId?.trim();
    const hasNewOwner = !!restaurant.ownerFirstName?.trim()
      && !!restaurant.ownerLastName?.trim()
      && !!restaurant.ownerPhoneNumber?.trim()
      && !!restaurant.ownerEmail?.trim();

    return !!restaurant.registrationNumber?.trim()
      && (hasExistingOwner || hasNewOwner)
      && !!restaurant.phone?.trim()
      && !!restaurant.country?.trim()
      && !!restaurant.city?.trim()
      && !!restaurant.street?.trim();
  }

  private toDisplayStatus(status: BackendRestaurantDto['status']): Restaurant['status'] {
    if (status === 'ACTIVE') return 'Actif';
    if (status === 'SUSPENDED') return 'Suspendu';
    return 'En attente';
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('221') && digits.length === 12 ? digits.slice(3) : digits;
}
