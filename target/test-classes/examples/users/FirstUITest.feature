Feature: karate uı automation

  Scenario: Sample UI Automation Test
    Given driver 'https://open.spotify.com/'
   And waitFor("[class='ButtonInner-sc-14ud5tc-0 iebPZv encore-inverted-light-set']")
   And click("[class='ButtonInner-sc-14ud5tc-0 iebPZv encore-inverted-light-set']")
    * delay(5000)
    And waitFor("[data-testid='login-username']")
    And input("[data-testid='login-username']" , 'kemalelmas03@gmail.com')
    And waitFor("[data-testid='login-password']")
    And input("[data-testid='login-password']", 'Gizli1$ey')
    And click("[class='Type__TypeElement-goli3j-0 dmuHFl sc-hKwDye eKDPqH']")
    * delay(5000)
    And waitFor("[class='Type__TypeElement-goli3j-0 eHCcSU J4xXuqyaJnnwS6s2p3ZB standalone-ellipsis-one-line']")
    And click("[class='Type__TypeElement-goli3j-0 eHCcSU J4xXuqyaJnnwS6s2p3ZB standalone-ellipsis-one-line']")
    And waitFor("[class='Type__TypeElement-goli3j-0 hVBZRJ']")
    And click("[class='Type__TypeElement-goli3j-0 hVBZRJ']")
    And waitFor("[class='f0GjZQZc4c_bKpqdyKbq JaGLdeBa2UaUMBT44vqI']")
    When click("[class='f0GjZQZc4c_bKpqdyKbq JaGLdeBa2UaUMBT44vqI']")
    And clear("[class='f0GjZQZc4c_bKpqdyKbq JaGLdeBa2UaUMBT44vqI']")
    And input("[class='f0GjZQZc4c_bKpqdyKbq JaGLdeBa2UaUMBT44vqI']", 'MentorLabs Challenge')
    And click("[class='ButtonInner-sc-14ud5tc-0 iebPZv encore-inverted-light-set']")
    * delay(5000)
   And waitFor("[class='Type__TypeElement-goli3j-0 ebHsEf l42JW4EP_5CU1Ba7jYIc']")
   And click("[class='Type__TypeElement-goli3j-0 ebHsEf l42JW4EP_5CU1Ba7jYIc']")
   And input("[class='Type__TypeElement-goli3j-0 ebHsEf l42JW4EP_5CU1Ba7jYIc']", 'Daft Punk')
   * delay(5000)
   And click("[aria-label='See more Daft Punk']")
   And waitFor("//div[@aria-rowindex='1']//div[@aria-colindex='3']//button[@data-testid='add-to-playlist-button']")
   And click("//div[@aria-rowindex='1']//div[@aria-colindex='3']//button[@data-testid='add-to-playlist-button']")
   * delay(3000)





