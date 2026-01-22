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
    return this.runLikeTransaction(recipeRef, shouldLike);
  }

  private async runLikeTransaction(
    recipeRef: ReturnType<typeof doc>,
    shouldLike: boolean
  ): Promise<number | null> {
    try {
      return await this.executeLikeTransaction(recipeRef, shouldLike);
    } catch (error) {
      return this.handleLikeError(error);
    }
  }

  private async executeLikeTransaction(
    recipeRef: ReturnType<typeof doc>,
    shouldLike: boolean
  ): Promise<number | null> {
    return runTransaction(this.firestore, (transaction) =>
      this.computeLikeTransaction(transaction, recipeRef, shouldLike)
    );
  }

  private async computeLikeTransaction(
    transaction: any,
    recipeRef: ReturnType<typeof doc>,
    shouldLike: boolean
  ): Promise<number | null> {
    const snapshot = await transaction.get(recipeRef);
    if (!snapshot.exists()) {
      return null;
    }
    const currentHearts = (snapshot.data() as { hearts?: number }).hearts ?? 0;
    const nextHearts = this.getNextHearts(currentHearts, shouldLike);
    transaction.update(recipeRef, { hearts: nextHearts });
    return nextHearts;
  }

  private handleLikeError(error: unknown): null {
    console.error('Failed to toggle recipe like', error);
    return null;
  }

  private getNextHearts(current: number, shouldLike: boolean): number {
    return shouldLike ? current + 1 : Math.max(0, current - 1);
  }
}
