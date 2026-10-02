// Firestore Service Layer
// This provides a Firestore-compatible API that works locally
// When you add real Firebase credentials, it will use cloud Firestore

import { isUsingPlaceholderCredentials } from './firebase.config';

// Local storage keys
const STORAGE_PREFIX = 'firestore_';

// Helper functions for local storage
function getCollection(collectionPath: string): any[] {
  const key = STORAGE_PREFIX + collectionPath;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveCollection(collectionPath: string, docs: any[]): void {
  const key = STORAGE_PREFIX + collectionPath;
  localStorage.setItem(key, JSON.stringify(docs));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Firestore-compatible types
export interface DocumentData {
  [key: string]: any;
}

export interface DocumentReference {
  id: string;
  path: string;
  collectionPath: string;
}

export interface QueryConstraint {
  field: string;
  operator: string;
  value: any;
}

// Collection reference
export function collection(path: string): { path: string } {
  return { path };
}

// Document reference
export function doc(collectionRef: { path: string }, docId?: string): DocumentReference {
  const id = docId || generateId();
  return {
    id,
    path: `${collectionRef.path}/${id}`,
    collectionPath: collectionRef.path
  };
}

// Get document
export async function getDoc(docRef: DocumentReference): Promise<{ exists: () => boolean; data: () => any; id: string }> {
  if (!isUsingPlaceholderCredentials) {
    // Real Firebase implementation would go here
    throw new Error('Real Firebase not configured');
  }
  
  const docs = getCollection(docRef.collectionPath);
  const doc = docs.find((d: any) => d.id === docRef.id);
  
  return {
    exists: () => !!doc,
    data: () => doc ? { ...doc, id: undefined } : null,
    id: docRef.id
  };
}

// Set document (create or update)
export async function setDoc(docRef: DocumentReference, data: DocumentData): Promise<void> {
  if (!isUsingPlaceholderCredentials) {
    throw new Error('Real Firebase not configured');
  }
  
  const docs = getCollection(docRef.collectionPath);
  const existingIndex = docs.findIndex((d: any) => d.id === docRef.id);
  
  if (existingIndex >= 0) {
    docs[existingIndex] = { ...data, id: docRef.id };
  } else {
    docs.push({ ...data, id: docRef.id });
  }
  
  saveCollection(docRef.collectionPath, docs);
}

// Add document (auto-generate ID)
export async function addDoc(collectionRef: { path: string }, data: DocumentData): Promise<DocumentReference> {
  if (!isUsingPlaceholderCredentials) {
    throw new Error('Real Firebase not configured');
  }
  
  const id = generateId();
  const docRef = doc(collectionRef, id);
  await setDoc(docRef, data);
  return docRef;
}

// Update document
export async function updateDoc(docRef: DocumentReference, data: DocumentData): Promise<void> {
  if (!isUsingPlaceholderCredentials) {
    throw new Error('Real Firebase not configured');
  }
  
  const docs = getCollection(docRef.collectionPath);
  const existingIndex = docs.findIndex((d: any) => d.id === docRef.id);
  
  if (existingIndex >= 0) {
    docs[existingIndex] = { ...docs[existingIndex], ...data };
    saveCollection(docRef.collectionPath, docs);
  } else {
    throw new Error('Document not found');
  }
}

// Delete document
export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  if (!isUsingPlaceholderCredentials) {
    throw new Error('Real Firebase not configured');
  }
  
  const docs = getCollection(docRef.collectionPath);
  const filtered = docs.filter((d: any) => d.id !== docRef.id);
  saveCollection(docRef.collectionPath, filtered);
}

// Query constraints
export function where(field: string, operator: string, value: any): QueryConstraint {
  return { field, operator, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): { field: string; direction: string } {
  return { field, direction };
}

// Query builder
export function query(collectionRef: { path: string }, ...constraints: any[]): { 
  get: () => Promise<{ docs: any[]; empty: boolean; size: number }> 
} {
  return {
    get: async () => {
      if (!isUsingPlaceholderCredentials) {
        throw new Error('Real Firebase not configured');
      }
      
      let docs = getCollection(collectionRef.path);
      
      // Apply where constraints
      for (const constraint of constraints) {
        if (constraint.field && constraint.operator) {
          docs = docs.filter((doc: any) => {
            const fieldValue = doc[constraint.field];
            const constraintValue = constraint.value;
            
            switch (constraint.operator) {
              case '==': return fieldValue === constraintValue;
              case '!=': return fieldValue !== constraintValue;
              case '<': return fieldValue < constraintValue;
              case '<=': return fieldValue <= constraintValue;
              case '>': return fieldValue > constraintValue;
              case '>=': return fieldValue >= constraintValue;
              case 'in': return constraintValue.includes(fieldValue);
              case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(constraintValue);
              default: return true;
            }
          });
        }
      }
      
      // Apply orderBy constraints
      for (const constraint of constraints) {
        if (constraint.field && constraint.direction) {
          docs.sort((a: any, b: any) => {
            const aVal = a[constraint.field];
            const bVal = b[constraint.field];
            
            if (aVal === bVal) return 0;
            const comparison = aVal < bVal ? -1 : 1;
            return constraint.direction === 'desc' ? -comparison : comparison;
          });
        }
      }
      
      return {
        docs: docs.map((d: any) => ({ id: d.id, data: () => ({ ...d, id: undefined }) })),
        empty: docs.length === 0,
        size: docs.length
      };
    }
  };
}

// Get all documents in collection
export async function getDocs(collectionRef: { path: string }): Promise<{ docs: any[]; empty: boolean; size: number }> {
  return query(collectionRef).get();
}

// Delete entire collection (useful for testing)
export async function deleteCollection(collectionPath: string): Promise<void> {
  if (!isUsingPlaceholderCredentials) {
    throw new Error('Real Firebase not configured');
  }
  
  localStorage.removeItem(STORAGE_PREFIX + collectionPath);
}

// Clear all data (useful for testing)
export function clearAllData(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
