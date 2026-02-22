import { EventRequestForm } from "@/components/store/event-request-form";

export default function EventsCateringPage() {
  return (
    <section className="section-shell space-y-8">
      <header className="max-w-3xl">
        <h1 className="h1">Events & Catering</h1>
        <p className="mt-3 text-muted-foreground">
          Weddings, birthdays, house parties, and corporate gatherings. Tell us your date and guest count,
          and we will curate a premium menu.
        </p>
      </header>

      <EventRequestForm />
    </section>
  );
}
