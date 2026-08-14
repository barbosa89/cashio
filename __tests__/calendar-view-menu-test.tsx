import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { CalendarViewMenu } from "@/components/calendar-view-menu";
import { CalendarViewMenu as WebCalendarViewMenu } from "@/components/calendar-view-menu.web";

jest.mock("@expo/ui/community/menu", () => ({
  MenuView: jest.fn(({ children }) => children),
}));

jest.mock("@/components/app-icon", () => ({ AppIcon: () => null }));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ text: "#111111", textSecondary: "#666666" }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { view?: string }) => {
      const translations: Record<string, string> = {
        "calendar.viewMenuTitle": "View as",
        "calendar.views.calendar": "Calendar",
        "calendar.views.list": "List",
      };
      if (key === "accessibility.changeCalendarView") {
        return `Change calendar view. Current view: ${values?.view}`;
      }
      return translations[key] ?? key;
    },
  }),
}));

const menuView = (
  jest.requireMock("@expo/ui/community/menu") as { MenuView: jest.Mock }
).MenuView;

describe("CalendarViewMenu", () => {
  test("marks the current native action and changes view", async () => {
    const onChange = jest.fn();
    await render(<CalendarViewMenu onChange={onChange} value="list" />);
    const props = menuView.mock.calls.at(-1)?.[0];
    expect(props.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "list", state: "on" }),
        expect.objectContaining({ id: "calendar", state: "off" }),
      ]),
    );
    await act(async () => {
      props.onPressAction({ nativeEvent: { event: "calendar" } });
    });
    expect(onChange).toHaveBeenCalledWith("calendar");
  });

  test("provides an interactive accessible fallback on web", async () => {
    const onChange = jest.fn();
    await render(<WebCalendarViewMenu onChange={onChange} value="list" />);
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Change calendar view. Current view: List",
      }),
    );
    await fireEvent.press(screen.getByRole("menuitem", { name: "Calendar" }));
    expect(onChange).toHaveBeenCalledWith("calendar");
  });
});
