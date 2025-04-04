"use client";

import { useState, useEffect, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { getSurveys, getSurveysByRating, getAverageRating, getSurveyById, deleteSurvey } from "@/lib/firebase/surveys/surveyModel";
import { Survey } from "@/lib/firebase/surveys/surveySchema";
import { AlertCircle, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon, Clock, Star, Trash2, Loader2, ArrowLeft, Filter, Download, Lock } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingsDistribution, setRatingsDistribution] = useState<Record<number, number>>({});
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use ref for password state to prevent re-renders
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const verifyPassword = () => {
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    const inputPassword = passwordInputRef.current?.value || "";
    
    if (inputPassword === correctPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch surveys
      const surveyData = await getSurveys();
      setSurveys(surveyData);

      // Fetch average rating
      const avgRating = await getAverageRating();
      setAverageRating(avgRating);

      // Fetch ratings distribution
      const ratingsData = await getSurveysByRating();
      setRatingsDistribution(ratingsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load survey data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId?: string) => {
    if (!surveyId) return;
    
    setIsDeleting(true);
    try {
      await deleteSurvey(surveyId);
      setIsDeleteDialogOpen(false);
      // Refresh data after deletion
      await fetchData();
    } catch (error) {
      console.error("Error deleting survey:", error);
      setError("Failed to delete survey. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    // Create CSV content from surveys
    const headers = ["ID", "Date", "Rating", "Ease of Use", "Positive Feedback", "Improvement Feedback", "Recording Times"];
    const csvRows = [
      headers.join(','),
      ...surveys.map(survey => {
        // Convert Timestamp to Date if needed
        const dateValue = survey.createdAt instanceof Timestamp 
          ? survey.createdAt.toDate() 
          : survey.createdAt instanceof Date 
            ? survey.createdAt 
            : new Date(survey.createdAt);
          
        return [
          survey.id,
          dateValue.toISOString(),
          survey.rating,
          survey.easeOfUse === null ? '' : survey.easeOfUse,
          `"${survey.positiveFeedback.replace(/"/g, '""')}"`,
          `"${survey.improvementFeedback.replace(/"/g, '""')}"`,
          `"${survey.recordingTimes.join(', ')}"`
        ].join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Create temp link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Transform rating data for the bar chart
  const ratingChartData = Object.entries(ratingsDistribution).map(([rating, count]) => ({
    rating: `${rating} ★`,
    count
  }));

  // Calculate average recording duration for each survey
  const recordingDurationData = surveys.map((survey, index) => {
    const avgDuration = survey.recordingTimes.length > 0 
      ? survey.recordingTimes.reduce((sum, time) => sum + time, 0) / survey.recordingTimes.length 
      : 0;
    
    // Handle Timestamp properly
    const dateValue = survey.createdAt instanceof Timestamp 
      ? survey.createdAt.toDate()
      : survey.createdAt instanceof Date 
        ? survey.createdAt 
        : new Date(survey.createdAt);
    
    return {
      id: index,
      surveyId: survey.id,
      avgDuration: Math.round(avgDuration),
      date: format(dateValue, 'MMM d')
    };
  });

  // Group surveys by rating for the pie chart
  const pieChartData = Object.entries(ratingsDistribution).map(([rating, count]) => ({
    name: `${rating} Stars`,
    value: count
  }));

  // Custom colors for the pie chart
  const COLORS = ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#8884d8'];

  // Helper to format date properly handling Firebase Timestamp objects
  const formatDate = (date: Date | number | Timestamp) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMM d, yyyy h:mm a');
    }
    return date instanceof Date
      ? format(date, 'MMM d, yyyy h:mm a')
      : format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading survey data...</p>
      </div>
    );
  }

  // Simplified password component that doesn't use Dialog
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-4 bg-card rounded-lg border shadow-sm">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Admin Authentication</h1>
            <p className="text-muted-foreground">Please enter the admin password to continue</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <form onSubmit={(e) => {
                e.preventDefault();
                verifyPassword();
              }}>
                <input
                  type="password"
                  ref={passwordInputRef}
                  placeholder="Enter password"
                  className={`w-full px-3 py-2 border rounded-md ${passwordError ? "border-red-500" : "border-input"}`}
                />
                <button 
                  type="submit" 
                  className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  Log In
                </button>
              </form>
              
              {passwordError && (
                <p className="text-sm text-red-500 mt-2">Incorrect password. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <a href="/">
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Button>
            <h1 className="text-2xl font-bold">Survey Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              size="sm" 
              onClick={fetchData}
              className="flex items-center gap-1.5"
            >
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-destructive/10 p-4 rounded-lg border border-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Error</h3>
              <p className="text-destructive/90 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <div className="border-b">
            <TabsList className="w-full gap-4 justify-start h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="surveys" 
                className="py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                Survey List
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview" className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <BarChartIcon className="h-5 w-5 text-primary" />
                    </div>
                    Total Surveys
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{surveys.length}</div>
                  <p className="text-sm text-muted-foreground">Responses collected</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    Average Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(averageRating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    Avg Recording Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate overall average recording time
                    const allTimes = surveys.flatMap(s => s.recordingTimes);
                    const avgTime = allTimes.length > 0
                      ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length
                      : 0;
                    
                    const minutes = Math.floor(avgTime / 60);
                    const seconds = Math.floor(avgTime % 60);
                    
                    return (
                      <>
                        <div className="text-3xl font-bold">
                          {minutes}:{seconds.toString().padStart(2, '0')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From {allTimes.length} recordings
                        </p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5" />
                    Rating Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of ratings from user surveys
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ratingChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Rating Distribution
                  </CardTitle>
                  <CardDescription>
                    Percentage breakdown by rating
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5" />
                  Average Recording Duration
                </CardTitle>
                <CardDescription>
                  Average recording time per survey response
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={recordingDurationData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="s" />
                    <Tooltip 
                      formatter={(value) => [`${value} seconds`, 'Avg Duration']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgDuration" 
                      stroke="#6366f1" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="surveys" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Survey Responses</CardTitle>
                <CardDescription>
                  All collected user feedback ({surveys.length} responses)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Ease of Use</TableHead>
                        <TableHead>Positive Feedback</TableHead>
                        <TableHead>Improvement Suggestions</TableHead>
                        <TableHead>Recording Times</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surveys.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                            No survey responses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        surveys.map((survey) => (
                          <TableRow key={survey.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(survey.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Badge variant={
                                  survey.rating >= 4 ? "success" :
                                  survey.rating >= 3 ? "warning" : "destructive"
                                }>
                                  {survey.rating} ★
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Badge variant={
                                  survey.easeOfUse === null ? "secondary" :
                                  survey.easeOfUse >= 4 ? "success" :
                                  survey.easeOfUse >= 3 ? "warning" : "destructive"
                                }>
                                  {survey.easeOfUse === null ? '—' : `${survey.easeOfUse} ★`}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {survey.positiveFeedback || "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {survey.improvementFeedback || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {survey.recordingTimes.map((time, index) => (
                                  <Badge key={index} variant="outline" className="font-mono text-xs">
                                    {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedSurvey(survey);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recording Duration Analysis</CardTitle>
                  <CardDescription>
                    Detailed breakdown of recording times across all responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-8">
                    {(() => {
                      // Calculate stats about recording times
                      const allTimes = surveys.flatMap(s => s.recordingTimes);
                      
                      if (allTimes.length === 0) {
                        return (
                          <div className="text-center text-muted-foreground py-8">
                            No recording data available
                          </div>
                        );
                      }
                      
                      const minTime = Math.min(...allTimes);
                      const maxTime = Math.max(...allTimes);
                      const avgTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
                      
                      // Create a histogram of recording durations
                      const histogramData: { duration: string; count: number }[] = [];
                      
                      // Group by 15-second intervals
                      const intervals = [0, 15, 30, 45, 60, 90, 120, 180, 240, 300];
                      
                      for (let i = 0; i < intervals.length - 1; i++) {
                        const start = intervals[i];
                        const end = intervals[i + 1];
                        const count = allTimes.filter(time => time >= start && time < end).length;
                        
                        if (count > 0) {
                          histogramData.push({
                            duration: `${start}-${end}s`,
                            count
                          });
                        }
                      }
                      
                      // Add a final bucket for anything over the last interval
                      const overCount = allTimes.filter(time => time >= intervals[intervals.length - 1]).length;
                      if (overCount > 0) {
                        histogramData.push({
                          duration: `${intervals[intervals.length - 1]}s+`,
                          count: overCount
                        });
                      }
                      
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-sm text-muted-foreground">Min Duration</div>
                              <div className="text-xl font-bold mt-1">
                                {Math.floor(minTime / 60)}:{(minTime % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                            
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-sm text-muted-foreground">Avg Duration</div>
                              <div className="text-xl font-bold mt-1">
                                {Math.floor(avgTime / 60)}:{Math.floor(avgTime % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                            
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-sm text-muted-foreground">Max Duration</div>
                              <div className="text-xl font-bold mt-1">
                                {Math.floor(maxTime / 60)}:{(maxTime % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={histogramData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="duration" />
                                <YAxis />
                                <Tooltip />
                                <Bar 
                                  dataKey="count" 
                                  name="Recordings" 
                                  fill="#6366f1" 
                                  radius={[4, 4, 0, 0]} 
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Analysis</CardTitle>
                  <CardDescription>
                    Key insights from user feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">Ratings by Percentage</h3>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = ratingsDistribution[rating] || 0;
                          const percentage = surveys.length > 0
                            ? Math.round((count / surveys.length) * 100)
                            : 0;
                            
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <div className="w-8 text-sm font-medium">{rating} ★</div>
                              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    rating >= 4 ? "bg-green-500" :
                                    rating >= 3 ? "bg-yellow-500" :
                                    "bg-red-500"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="w-10 text-sm text-muted-foreground text-right">
                                {percentage}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-3">Recent Positive Feedback</h3>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {surveys
                          .filter(s => s.positiveFeedback?.trim())
                          .slice(0, 3)
                          .map((survey, i) => (
                            <div key={i} className="bg-muted/50 p-3 rounded-md text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: survey.rating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(survey.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm">{survey.positiveFeedback}</p>
                            </div>
                          ))}
                        {surveys.filter(s => s.positiveFeedback?.trim()).length === 0 && (
                          <p className="text-muted-foreground text-sm italic">
                            No positive feedback available
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-3">Recent Improvement Suggestions</h3>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {surveys
                          .filter(s => s.improvementFeedback?.trim())
                          .slice(0, 3)
                          .map((survey, i) => (
                            <div key={i} className="bg-muted/50 p-3 rounded-md text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: survey.rating }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(survey.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm">{survey.improvementFeedback}</p>
                            </div>
                          ))}
                        {surveys.filter(s => s.improvementFeedback?.trim()).length === 0 && (
                          <p className="text-muted-foreground text-sm italic">
                            No improvement suggestions available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this survey response? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDelete(selectedSurvey?.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 