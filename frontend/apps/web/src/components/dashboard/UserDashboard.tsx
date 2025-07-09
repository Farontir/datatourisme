'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useSearchStore } from '../../stores/search-store';
import { Button } from '@datatourisme/ui';
import { 
  User, 
  Heart, 
  Calendar, 
  MapPin, 
  Settings, 
  Download,
  Shield,
  Bell,
  CreditCard,
  Activity
} from '@datatourisme/ui/icons';

interface DashboardStats {
  totalBookings: number;
  totalFavorites: number;
  totalSpent: number;
  upcomingBookings: number;
}

interface RecentBooking {
  id: string;
  resourceName: string;
  date: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  amount: number;
  location: string;
}

interface UserPreferences {
  language: string;
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  accessibility: {
    wheelchairAccessible: boolean;
    hearingImpaired: boolean;
    visuallyImpaired: boolean;
  };
}

export function UserDashboard() {
  const { user, updateUser, updatePreferences } = useAuthStore();
  const { favorites } = useSearchStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalFavorites: 0,
    totalSpent: 0,
    upcomingBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user dashboard data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real app, these would be API calls
      setStats({
        totalBookings: 12,
        totalFavorites: favorites.length,
        totalSpent: 2450.00,
        upcomingBookings: 3,
      });

      setRecentBookings([
        {
          id: '1',
          resourceName: 'Château de Versailles',
          date: new Date('2024-03-15'),
          status: 'confirmed',
          amount: 25.00,
          location: 'Versailles',
        },
        {
          id: '2',
          resourceName: 'Musée du Louvre',
          date: new Date('2024-02-28'),
          status: 'confirmed',
          amount: 17.00,
          location: 'Paris',
        },
        {
          id: '3',
          resourceName: 'Tour Eiffel',
          date: new Date('2024-02-15'),
          status: 'confirmed',
          amount: 32.00,
          location: 'Paris',
        },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/users/export-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datatourisme-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      try {
        const response = await fetch('/api/users/delete-account', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
          },
        });

        if (response.ok) {
          useAuthStore.getState().signOut();
        }
      } catch (error) {
        console.error('Failed to delete account:', error);
      }
    }
  };

  if (!user) {
    return <div>Veuillez vous connecter pour accéder à votre tableau de bord.</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
    { id: 'bookings', label: 'Réservations', icon: Calendar },
    { id: 'favorites', label: 'Favoris', icon: Heart },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Confidentialité', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bonjour, {user.name || user.email}
        </h1>
        <p className="text-gray-600 mt-2">
          Gérez vos réservations, favoris et préférences
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Réservations totales</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Favoris</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalFavorites}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total dépensé</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.totalSpent.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <MapPin className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">À venir</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.upcomingBookings}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Réservations récentes</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-gray-500" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.resourceName}</p>
                        <p className="text-sm text-gray-500">
                          {booking.location} • {booking.date.toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmé' :
                         booking.status === 'pending' ? 'En attente' : 'Annulé'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {booking.amount.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Confidentialité et données</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Gestion des données RGPD</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Conformément au RGPD, vous avez le droit d'exporter ou de supprimer vos données personnelles.
                </p>
                
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exporter mes données</span>
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="flex items-center space-x-2"
                  >
                    <span>Supprimer mon compte</span>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Préférences de confidentialité</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profil public</p>
                      <p className="text-sm text-gray-500">Rendre votre profil visible aux autres utilisateurs</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Analyses d'utilisation</p>
                      <p className="text-sm text-gray-500">Partager des données d'utilisation anonymisées</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cookies marketing</p>
                      <p className="text-sm text-gray-500">Autoriser les cookies pour le marketing personnalisé</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Booking Filters */}
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Mes réservations</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Toutes</Button>
                  <Button variant="outline" size="sm">Confirmées</Button>
                  <Button variant="outline" size="sm">En attente</Button>
                  <Button variant="outline" size="sm">Annulées</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{booking.resourceName}</h4>
                          <p className="text-sm text-gray-500">{booking.location}</p>
                          <p className="text-sm text-gray-500">{booking.date.toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.status === 'confirmed' ? 'Confirmé' :
                           booking.status === 'pending' ? 'En attente' : 'Annulé'}
                        </span>
                        <p className="text-lg font-medium text-gray-900">{booking.amount.toFixed(2)} €</p>
                        <div className="flex space-x-2 mt-2">
                          <Button variant="outline" size="sm">Voir</Button>
                          <Button variant="outline" size="sm">Modifier</Button>
                          <Button variant="outline" size="sm">Annuler</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Mes favoris</h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Tous</Button>
                <Button variant="outline" size="sm">Monuments</Button>
                <Button variant="outline" size="sm">Musées</Button>
                <Button variant="outline" size="sm">Restaurants</Button>
              </div>
            </div>
            
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun favori</h3>
                <p className="mt-1 text-sm text-gray-500">Commencez à ajouter des lieux à vos favoris</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      <div className="flex items-center justify-center">
                        <MapPin className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900">{favorite.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{favorite.location}</p>
                      <div className="flex items-center justify-between mt-4">
                        <Button variant="outline" size="sm">Voir</Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Informations personnelles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={user.name?.split(' ')[0] || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={user.name?.split(' ')[1] || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={user.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nationalité</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option>Française</option>
                    <option>Autre</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Adresse complète"
                ></textarea>
              </div>
              
              <div className="mt-6">
                <Button>Sauvegarder les modifications</Button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Préférences d'accessibilité</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Accès PMR</p>
                    <p className="text-sm text-gray-500">Privilégier les lieux accessibles aux personnes à mobilité réduite</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Aide auditive</p>
                    <p className="text-sm text-gray-500">Afficher les lieux avec des aides auditives</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Aide visuelle</p>
                    <p className="text-sm text-gray-500">Afficher les lieux avec des aides visuelles</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Sécurité du compte</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Mot de passe</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <Button>Modifier le mot de passe</Button>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Authentification à deux facteurs</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Ajoutez une couche de sécurité supplémentaire à votre compte
                  </p>
                  <Button variant="outline">Activer 2FA</Button>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Sessions actives</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chrome sur Windows</p>
                        <p className="text-xs text-gray-500">Connexion actuelle • Paris, France</p>
                      </div>
                      <span className="text-xs text-green-600">Actif</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Safari sur iPhone</p>
                        <p className="text-xs text-gray-500">Il y a 2 heures • Lyon, France</p>
                      </div>
                      <Button variant="outline" size="sm">Déconnecter</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Préférences de notification</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Notifications par email</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Confirmations de réservation</p>
                      <p className="text-sm text-gray-500">Recevoir un email lors de chaque réservation</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rappels de réservation</p>
                      <p className="text-sm text-gray-500">Recevoir un rappel 24h avant votre visite</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Offres spéciales</p>
                      <p className="text-sm text-gray-500">Recevoir des offres personnalisées</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Notifications SMS</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Confirmations urgentes</p>
                      <p className="text-sm text-gray-500">Recevoir des SMS pour les confirmations importantes</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rappels de dernière minute</p>
                      <p className="text-sm text-gray-500">Rappels SMS 2h avant votre visite</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Notifications push</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Notifications en temps réel</p>
                      <p className="text-sm text-gray-500">Recevoir des notifications push sur votre appareil</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Nouvelles recommandations</p>
                      <p className="text-sm text-gray-500">Être notifié des nouveaux lieux correspondant à vos goûts</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <Button>Sauvegarder les préférences</Button>
              </div>
            </div>
          </div>
        )}

        {/* Add other tab content as needed */}
      </div>
    </div>
  );
}