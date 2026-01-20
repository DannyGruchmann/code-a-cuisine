import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docSnapshots,
  query,
  where,
  orderBy,
  collectionData,
  runTransaction,
  limit
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { RecipeDetail, RecipeSummary } from '../models/recipe-request.model';

export interface RecipeLibraryEntry extends RecipeSummary {
  docId?: string;
  cuisine: string;
  diet: string;
  cookTimeTag: string;
  thumbnail: string;
  hearts: number;
  createdAt?: unknown;
}

export type RecipeLibraryDetail = RecipeDetail & RecipeLibraryEntry;

@Injectable({
  providedIn: 'root'
})
export class RecipeLibraryService {
  constructor(private firestore: Firestore) {}

  getRecipesByCuisine(cuisine: string): Observable<RecipeLibraryEntry[]> {
    const recipesRef = collection(this.firestore, 'recipes');
    const recipesQuery = query(
      recipesRef,
      where('cuisine', '==', cuisine),
      orderBy('createdAt', 'desc')
    );
    return collectionData(recipesQuery, { idField: 'docId' }).pipe(
      map((recipes) => recipes as RecipeLibraryEntry[])
    );
  }

  getRecipeById(id: string): Observable<RecipeLibraryDetail | null> {
    const recipeRef = doc(this.firestore, 'recipes', id);
    return docSnapshots(recipeRef).pipe(
      map((snapshot) => {
        if (!snapshot.exists()) {
          return null;
        }
        return { docId: snapshot.id, ...snapshot.data() } as RecipeLibraryDetail;
      })
    );
  }

  getMostLikedRecipes(maxItems = 5): Observable<RecipeLibraryEntry[]> {
    const recipesRef = collection(this.firestore, 'recipes');
    const recipesQuery = query(recipesRef, orderBy('hearts', 'desc'), limit(maxItems));
    return collectionData(recipesQuery, { idField: 'docId' }).pipe(
      map((recipes) => recipes as RecipeLibraryEntry[])
    );
  }

  async toggleRecipeLike(id: string, shouldLike: boolean): Promise<number | null> {
    const recipeRef = doc(this.firestore, 'recipes', id);
    try {
      return await runTransaction(this.firestore, async (transaction) => {
        const snapshot = await transaction.get(recipeRef);
        if (!snapshot.exists()) {
          return null;
        }
        const data = snapshot.data() as { hearts?: number };
        const currentHearts = data.hearts ?? 0;
        const nextHearts = shouldLike ? currentHearts + 1 : Math.max(0, currentHearts - 1);
        transaction.update(recipeRef, { hearts: nextHearts });
        return nextHearts;
      });
    } catch (error) {
      console.error('Failed to toggle recipe like', error);
      return null;
    }
  }
}
