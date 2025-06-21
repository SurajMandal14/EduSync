
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { generateIdeas } from "@/ai/flows/generate-ideas";
import { rateIdea } from "@/ai/flows/rate-idea";
import { StarRating } from "@/components/star-rating";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
});

type Idea = {
  text: string;
  rating: number;
};

export default function IdeaSparkPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setIdeas([]);
    try {
      const result = await generateIdeas({ topic: values.topic });
      if (result && result.ideas) {
        setIdeas(result.ideas.map((ideaText) => ({ text: ideaText, rating: 0 })));
        toast({
          title: "Ideas Generated!",
          description: `We've sparked ${result.ideas.length} new ideas for you.`,
        });
      } else {
        throw new Error("AI did not return any ideas.");
      }
    } catch (error) {
      console.error("Error generating ideas:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate ideas. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRating(ideaText: string, rating: number) {
    setIdeas((currentIdeas) =>
      currentIdeas.map((idea) =>
        idea.text === ideaText ? { ...idea, rating } : idea
      )
    );

    try {
      await rateIdea({ idea: ideaText, rating });
      toast({
        title: "Rating Submitted",
        description: `Thanks for your feedback!`,
      });
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        variant: "destructive",
        title: "Rating Error",
        description: "Failed to submit rating.",
      });
    }
  }

  return (
    <main className="container mx-auto max-w-4xl py-8 md:py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
          <Sparkles className="w-10 h-10" />
          Idea Spark
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Unleash your creativity. Enter a topic and let our AI generate novel, feasible, and impactful ideas for you.
        </p>
      </div>

      <Card className="shadow-lg mb-12">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input
                        placeholder="e.g., 'sustainable urban farming' or 'mobile apps for language learning'"
                        className="h-12 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="h-12 px-6 bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Lightbulb className="mr-2 h-5 w-5" />
                )}
                Generate
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="mt-12">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!isLoading && ideas.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-center">Generated Ideas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ideas.map((idea, index) => (
                <Card key={index} className="flex flex-col justify-between hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <p className="text-card-foreground">{idea.text}</p>
                  </CardContent>
                  <div className="p-6 pt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Rate this idea:</p>
                    <StarRating
                      rating={idea.rating}
                      onRate={(newRating) => handleRating(idea.text, newRating)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {!isLoading && ideas.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Ready to ignite some ideas?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a topic above to get started.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
