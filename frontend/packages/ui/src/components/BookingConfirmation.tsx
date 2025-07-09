import React, { useState, useCallback } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Alert, AlertDescription } from './Alert';
import { 
  CheckCircle,
  Download,
  Calendar,
  MapPin,
  Mail,
  Share2,
  QrCode,
  FileText,
  Users,
  Clock,
  CreditCard,
  Phone,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

// Types
export interface BookingData {
  id: string;
  confirmationNumber: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  resourceName: string;
  resourceLocation: string;
  resourceAddress: string;
  date: Date;
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  guestCount: number;
  guests: Array<{
    firstName: string;
    lastName: string;
    category: string;
  }>;
  primaryContact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  pricing: {
    total: number;
    currency: string;
  };
  specialRequirements?: string;
  qrCodeData?: string;
}

export interface BookingConfirmationProps {
  booking: BookingData;
  onDownloadPDF?: () => Promise<void>;
  onDownloadICS?: () => Promise<void>;
  onDownloadQR?: () => Promise<void>;
  onShare?: () => Promise<void>;
  onEmailConfirmation?: () => Promise<void>;
  showActions?: boolean;
  className?: string;
}

// QR Code Component (simulated)
interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeDisplay: React.FC<QRCodeProps> = ({ 
  value, 
  size = 200, 
  className 
}) => {
  // In a real implementation, you would use a QR code library like qrcode.js
  return (
    <div 
      className={cn(
        'bg-white border-2 border-neutral-200 flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <QrCode className="w-16 h-16 text-neutral-400" />
      <span className="sr-only">QR Code: {value}</span>
    </div>
  );
};

// Share Options Component
interface ShareOptionsProps {
  bookingData: BookingData;
  onClose: () => void;
}

const ShareOptions: React.FC<ShareOptionsProps> = ({ bookingData, onClose }) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/booking/${bookingData.confirmationNumber}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShare = async (platform: string) => {
    const text = `Ma réservation pour ${bookingData.resourceName} le ${bookingData.date.toLocaleDateString('fr-FR')} à ${bookingData.timeSlot.startTime}`;
    
    switch (platform) {
      case 'email':
        window.open(`mailto:?subject=Ma réservation ${bookingData.confirmationNumber}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(text + ' ' + shareUrl)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`);
        break;
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
        <span className="text-sm text-neutral-600 truncate">{shareUrl}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="ml-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => handleShare('email')}>
          <Mail className="w-4 h-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" onClick={() => handleShare('sms')}>
          <Phone className="w-4 h-4 mr-2" />
          SMS
        </Button>
        <Button variant="outline" onClick={() => handleShare('whatsapp')}>
          <Phone className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
        <Button variant="outline" onClick={() => handleShare('twitter')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Twitter
        </Button>
      </div>
    </div>
  );
};

// Main Booking Confirmation Component
export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onDownloadPDF,
  onDownloadICS,
  onDownloadQR,
  onShare,
  onEmailConfirmation,
  showActions = true,
  className
}) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isLoading, setIsLoading] = useState({
    pdf: false,
    ics: false,
    qr: false,
    email: false,
  });

  const handleAction = useCallback(async (
    action: 'pdf' | 'ics' | 'qr' | 'email',
    callback?: () => Promise<void>
  ) => {
    if (!callback) return;
    
    setIsLoading(prev => ({ ...prev, [action]: true }));
    try {
      await callback();
    } catch (error) {
      console.error(`Error with ${action} action:`, error);
    } finally {
      setIsLoading(prev => ({ ...prev, [action]: false }));
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'Inconnue';
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Réservation confirmée !
        </h1>
        <p className="text-lg text-neutral-600">
          Votre réservation {booking.confirmationNumber} a été enregistrée avec succès.
        </p>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Détails de votre réservation</CardTitle>
          <Badge className={getStatusColor(booking.status)}>
            {getStatusText(booking.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resource Information */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-neutral-200 rounded-lg flex items-center justify-center">
              <MapPin className="w-8 h-8 text-neutral-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-neutral-900">
                {booking.resourceName}
              </h3>
              <p className="text-neutral-600">{booking.resourceLocation}</p>
              <p className="text-sm text-neutral-500">{booking.resourceAddress}</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Date</p>
                <p className="text-neutral-600">
                  {booking.date.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Horaire</p>
                <p className="text-neutral-600">
                  {booking.timeSlot.startTime} - {booking.timeSlot.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Guests and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Visiteurs</p>
                <p className="text-neutral-600">{booking.guestCount} personne(s)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-neutral-900">Total payé</p>
                <p className="text-neutral-600">
                  {booking.pricing.total.toFixed(2)} {booking.pricing.currency.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-neutral-900 mb-3">Contact principal</h4>
            <div className="space-y-2">
              <p className="text-neutral-600">
                {booking.primaryContact.firstName} {booking.primaryContact.lastName}
              </p>
              <p className="text-neutral-600">{booking.primaryContact.email}</p>
              {booking.primaryContact.phone && (
                <p className="text-neutral-600">{booking.primaryContact.phone}</p>
              )}
            </div>
          </div>

          {/* Special Requirements */}
          {booking.specialRequirements && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-neutral-900 mb-2">Demandes spéciales</h4>
              <p className="text-neutral-600">{booking.specialRequirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code */}
      {booking.qrCodeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Code QR de votre réservation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <QRCodeDisplay 
              value={booking.qrCodeData} 
              size={200}
              className="rounded-lg"
            />
            <p className="text-sm text-neutral-600 text-center">
              Présentez ce code QR lors de votre visite pour un accès rapide
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {showActions && (
        <Card>
          <CardHeader>
            <CardTitle>Actions disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {onDownloadPDF && (
                <Button
                  variant="outline"
                  onClick={() => handleAction('pdf', onDownloadPDF)}
                  disabled={isLoading.pdf}
                  className="w-full"
                >
                  {isLoading.pdf ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
              )}

              {onDownloadICS && (
                <Button
                  variant="outline"
                  onClick={() => handleAction('ics', onDownloadICS)}
                  disabled={isLoading.ics}
                  className="w-full"
                >
                  {isLoading.ics ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  Calendrier
                </Button>
              )}

              {onDownloadQR && (
                <Button
                  variant="outline"
                  onClick={() => handleAction('qr', onDownloadQR)}
                  disabled={isLoading.qr}
                  className="w-full"
                >
                  {isLoading.qr ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4 mr-2" />
                  )}
                  QR Code
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setShowShareOptions(true)}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>

            {onEmailConfirmation && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => handleAction('email', onEmailConfirmation)}
                  disabled={isLoading.email}
                  className="w-full"
                >
                  {isLoading.email ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Renvoyer la confirmation par email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Modal */}
      {showShareOptions && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Partager votre réservation</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareOptions(false)}
            >
              ×
            </Button>
          </CardHeader>
          <CardContent>
            <ShareOptions
              bookingData={booking}
              onClose={() => setShowShareOptions(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Important Information */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important :</strong> Vous recevrez un email de confirmation avec tous les détails. 
          Pensez à vérifier vos spams. Un rappel vous sera envoyé 24h avant votre visite.
        </AlertDescription>
      </Alert>
    </div>
  );
};

BookingConfirmation.displayName = 'BookingConfirmation';