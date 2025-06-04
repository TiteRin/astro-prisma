# Gestion des uploads asynchrones et notifications

## Problématique
Lorsqu'un utilisateur navigue vers une autre page de l'application pendant un upload, nous devons :
1. Lui indiquer qu'il peut quitter la page
2. Lui permettre de suivre l'état de son upload
3. Le notifier quand sa fiche est disponible

## Solution proposée

### 1. Stockage de l'état
- Utiliser le localStorage pour stocker l'état de l'upload en cours
- Structure de données simplifiée :
```typescript
interface UploadState {
  id: string;              // ID unique de l'upload
  startTime: Date;         // Date de début
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep: string;     // Étape en cours
  message: string;         // Message de progression
  ficheId?: string;        // ID de la fiche une fois créée
  slug?: string;           // Slug de la fiche
  finalUrl?: string;       // URL finale une fois le build terminé
}
```

### 2. Gestion de la navigation
- Ajouter un message dans le modal : "Vous pouvez naviguer sur le site, vous serez notifié quand votre fiche sera disponible"
- Stocker l'état de l'upload dans le localStorage
- Vérifier à chaque chargement de page s'il y a des uploads en cours

### 3. Notification de disponibilité
- Ajouter une bannière de notification en haut de la page quand la fiche est disponible
- Lien direct vers la fiche dans la notification
- Option pour masquer la notification

## Étapes d'implémentation

1. **Stockage local**
   - [ ] Créer les types et interfaces
   - [ ] Implémenter les fonctions de gestion du localStorage
   - [ ] Mettre à jour l'état à chaque étape de l'upload

2. **Modal de progression**
   - [ ] Ajouter le message de navigation
   - [ ] Mettre à jour le style pour indiquer que l'utilisateur peut quitter
   - [ ] Ajouter un bouton "Suivre l'état" qui redirige vers la page de statut

3. **Bannière de notification**
   - [ ] Créer le composant de bannière
   - [ ] Implémenter la logique d'affichage/masquage
   - [ ] Ajouter le lien vers la fiche

## Exemple de code

### Gestion du localStorage
```typescript
const uploadState = {
  save: (state: UploadState) => {
    localStorage.setItem(`upload_${state.id}`, JSON.stringify(state));
  },
  get: (id: string): UploadState | null => {
    const data = localStorage.getItem(`upload_${state.id}`);
    return data ? JSON.parse(data) : null;
  },
  getAll: (): UploadState[] => {
    return Object.keys(localStorage)
      .filter(key => key.startsWith('upload_'))
      .map(key => JSON.parse(localStorage.getItem(key)!));
  }
};
```

### Bannière de notification
```typescript
interface NotificationBannerProps {
  upload: UploadState;
  onClose: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ upload, onClose }) => {
  if (upload.status !== 'completed') return null;

  return (
    <div className="alert alert-success shadow-lg">
      <div>
        <h3 className="font-bold">Votre fiche est disponible !</h3>
        <div className="text-sm">
          <a 
            href={`/fiches/${upload.slug}`}
            className="link link-primary hover:link-secondary"
          >
            Voir la fiche
          </a>
        </div>
      </div>
      <button 
        className="btn btn-ghost btn-sm"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
```

## Avantages de cette approche
- Solution beaucoup plus simple à implémenter
- Pas besoin de service worker ou de notifications push
- Expérience utilisateur fluide et intuitive
- Pas de dépendance à des fonctionnalités avancées du navigateur

## Limitations
- Les notifications ne sont visibles que sur le site
- Pas de notification si l'utilisateur ferme le navigateur
- Le localStorage a une limite de taille (mais suffisante pour notre cas)

## Évolutions futures possibles
- Ajouter des notifications push pour une meilleure expérience
- Implémenter un système de reprise d'upload
- Ajouter des notifications par email 