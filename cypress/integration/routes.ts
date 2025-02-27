describe("Parsley Routes", () => {
  it("should load task logs when visiting a task log page", () => {
    const logLink =
      "/evergreen/spruce_ubuntu1604_test_2c9056df66d42fb1908d52eed096750a91f1f089_22_03_02_16_45_12/0/task";
    cy.visit(logLink);
    cy.get("[data-cy^='log-row-']").should("be.visible");
    cy.dataCy("ansii-row").should("be.visible");
    cy.dataCy("resmoke-row").should("not.exist");
    cy.contains("Task logger initialized");
  });
  it("should show error toast when visiting a task log page of an invalid task", () => {
    const logLink = "/evergreen/invalid-task-id/0/task";
    cy.visit(logLink);
    cy.validateToast("error", "Network response was not ok (404)", true);
  });
  it("should load test results when visiting a test result page", () => {
    const logLink =
      "/test/spruce_ubuntu1604_check_codegen_d54e2c6ede60e004c48d3c4d996c59579c7bbd1f_22_03_02_15_41_35/0/JustAFakeTestInALonelyWorld";
    const testLogLine =
      "AssertionError: Timed out retrying after 4000ms: Too many elements found. Found '1', expected '0'";
    cy.visit(logLink);
    cy.get("[data-cy^='log-row-']").should("be.visible");
    cy.dataCy("ansii-row").should("be.visible");
    cy.dataCy("resmoke-row").should("not.exist");
    cy.contains(testLogLine);
  });
  it("should load resmoke logs when visiting a resmoke log page", () => {
    const logLink =
      "/resmoke/7e208050e166b1a9025c817b67eee48d/test/1716e11b4f8a4541c5e2faf70affbfab";
    const resmokeLogLine =
      "fsm_workload_test:internal_transactions_kill_sessions";
    cy.visit(logLink);
    cy.get("[data-cy^='log-row-']").should("be.visible");
    cy.dataCy("ansii-row").should("not.exist");
    cy.dataCy("resmoke-row").should("be.visible");
    cy.contains(resmokeLogLine);
  });
  it("should show 404 when visiting a nonexistent page", () => {
    cy.visit("/this/is/not/a/real/page");
    cy.dataCy("404").should("be.visible");
  });

  // This test block can be deleted in EVG-18748.
  describe("redirecting", () => {
    it("should redirect selectedLine to shareLine, preserving all other query params", () => {
      cy.visit(
        "/evergreen/spruce_ubuntu1604_test_2c9056df66d42fb1908d52eed096750a91f1f089_22_03_02_16_45_12/0/task?bookmarks=0,297&filters=100this%2520is%2520a%2520filter&highlights=this%2520is%2520a%2520highlight&selectedLine=7"
      );
      cy.location("search").should("not.contain", "selectedLine");
      cy.location("search").should(
        "equal",
        "?bookmarks=0,297&filters=100this%2520is%2520a%2520filter&highlights=this%2520is%2520a%2520highlight&shareLine=7"
      );
    });
    it("should correctly jump to line when selectedLine is replaced by shareLine param", () => {
      cy.visit(
        "/evergreen/spruce_ubuntu1604_test_2c9056df66d42fb1908d52eed096750a91f1f089_22_03_02_16_45_12/0/task?bookmarks=0,297&selectedLine=200"
      );
      cy.location("search").should("not.contain", "selectedLine");
      cy.location("search").should("equal", "?bookmarks=0,297&shareLine=200");
      cy.dataCy("log-row-200").should("be.visible"); // Should have jumped to line 200.
      cy.get("[data-shared='true']").should("be.visible");
    });
  });
});
