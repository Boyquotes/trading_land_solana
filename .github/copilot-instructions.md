## Project context
This project is a web game built with React and ThreeJS 3D librairie.

REALLY IMPORTANT INSTRUCTIONS WHEN CODING:
    Important: fix things at the cause, not the symptom.

    Be very detailed with summarization and do not miss out things that are important.

    Never remove comments that are already there.

    check if actual comments in the code are bogus/deprecated and fix them.

    keep original code and original logic when you can.

    We are in development mode. There is no production code so there is no need for any such thing as backward compatibility.

    Never assume, always ask question if something seems seems not clear.

    Important: Always implement full correct code. No placeholders. Finish what you start.

    Always type your variables, functions parameters, functions return type

    Ternary operators are only good for single instruction/oneliner/short statements. Don't use nested ternary operators. Don't use embedded code within ternary operators. Avoid ternary operators for UI/UX code.
    
    When working on a piece of code always look at the whole callstack: what code calls the function you're working with. What code this function you work with call. This should help you get a better understanding of the context.

    Always try to find information on the types you're working with. If a particular non "langage native" type is used, find its type declaration to understand it.

    REACT IMPORTANT RULE: Never try to solve React "rendering" issues with timer. When dealing with rendering issue, you need to look up the whole callstack of event that lead to render or not.

REALLY IMPORTANT INSTRUCTIONS WHEN REFACTORING:
    Refactoring is a difficult task of breaking the code into pieces and rebuilding it in a better way. So This is not a moment to change the original code as it would create more problems than benefits.

    When refactoring: Stick to original code behavior and logic. Reproduce old behavior 1:1 in new code.

    Never reinterpret code in a new way

    Don't change code in any way.

    Extract code to new function/class without changing it.

    Don't rename variables and functions

    Don't remove typed hints

    Don't remove original comments. 

    Add new comments when necessary.

    Don't take the freedom to add new behaviors when refactoring. You're not the architech here but the developer.


CRITICAL RULES FOR CODE MAINTENANCE:
    If the new code need new package, install them.

    Before modifying any code, identify and understand ALL conditional checks and business logic.
    
    When working with parsers or validators, preserve ALL condition checks exactly as they appear in the original code.
    
    Do not alter ANY conditional expressions without explicit permission, even if they seem redundant or could be "improved."
    
    Preserve ALL specialized filtering logic (such as checks for specific string values, types, or attributes).
    
    When in doubt about a condition's purpose, maintain it exactly as-is and add a comment requesting clarification.
    
    For any class implementing an interface or extending a parent class, verify that the modified code still meets all requirements of that contract.
    
    After refactoring, validate that the function accepts exactly the same inputs and produces exactly the same outputs as before.
    
    Do not simplify complex boolean expressions or conditional chains without explicit approval.
    
    Write tests that verify the EXACT same behavior is maintained after your changes.
    
    Always document the actual behavior you observe in the existing code, not what you think it should be doing.
