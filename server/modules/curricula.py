"""Explicit curriculum routing and original, inspectable Mathematics starter lessons."""
from copy import deepcopy
from fastapi import HTTPException

NSSCO_SOURCE = 'https://www.nied.edu.na/assets/documents/02Syllabuses/05SeniorSecondary/Mathematics/NSSCO_Mathematics_syllabus.pdf'
NSSCAS_SOURCE = 'https://www.nied.edu.na/assets/documents/02Syllabuses/05SeniorSecondary/Mathematics/8227_NSSCAS_Mathematics_final_updated_20_November_2020.pdf'
IGCSE_SOURCE = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/'
ADVANCED_SOURCE = 'https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf'
TOPICS = {'linear':'Linear equations', 'proportion':'Proportion and percentages',
          'pythagoras':'Pythagoras and distance', 'quadratic':'Quadratic equations',
          'differentiate':'Differentiation', 'integrate':'Integration'}
COURSES = [
 {'id':'na-nssco','pathway':'Namibia','qualification':'NSSCO','code':'6131','version':'NIED 2018','grades':[10,11], 'source':NSSCO_SOURCE,'topics':['linear','proportion','pythagoras','quadratic']},
 {'id':'na-nsscas','pathway':'Namibia','qualification':'NSSCAS','code':'8227','version':'NIED 2020','grades':[12], 'source':NSSCAS_SOURCE,'topics':['quadratic','differentiate','integrate']},
 {'id':'cam-igcse-core','pathway':'Cambridge','qualification':'IGCSE Core','code':'0580','version':'2025–2027','grades':[10,11,12], 'source':IGCSE_SOURCE,'topics':['linear','proportion','pythagoras']},
 {'id':'cam-igcse-extended','pathway':'Cambridge','qualification':'IGCSE Extended','code':'0580','version':'2025–2027','grades':[10,11,12], 'source':IGCSE_SOURCE,'topics':['linear','proportion','pythagoras','quadratic']},
]
for route,label in [('as-pure','AS Level — Pure Mathematics'),('as-mechanics','AS Level — Pure Mathematics and Mechanics'),('as-statistics','AS Level — Pure Mathematics and Statistics'),('a-mechanics-statistics','A Level — Pure Mathematics, Mechanics and Statistics'),('a-statistics','A Level — Pure Mathematics and Statistics')]:
    COURSES.append({'id':'cam-'+route,'pathway':'Cambridge','qualification':label,'code':'9709','version':'2026–2027','grades':[10,11,12], 'source':ADVANCED_SOURCE,'topics':['quadratic','differentiate','integrate']})

NOTICE = 'Original starter practice, not a complete syllabus or an official examination question. Teacher review is required before assessed use.'


def catalogue():
    return [{**course,'topics':[{'id':t,'label':TOPICS[t]} for t in course['topics']], 'exam_years':[2026,2027], 'coverage_notice':NOTICE + (' The pure-only AS route has no progression to A Level under this syllabus; confirm the route with your teacher.' if course['id']=='cam-as-pure' else '') + (' Only selected pure Mathematics revision topics are included; mechanics/statistics lessons are not included.' if course['code']=='9709' else '')} for course in COURSES]


def course_for(course_id,grade,exam_year):
    for course in catalogue():
        if course['id']==course_id and grade in course['grades'] and exam_year in course['exam_years']:
            return course
    raise HTTPException(422,'Choose a supported Mathematics pathway, grade and examination year (2026 or 2027).')


LESSONS = {
 'linear': dict(challenge='Solve $2x+3=11$. Predict the first operation and explain why.',
 hints=['Which operation was performed last?', 'Undo addition before multiplication.', 'Subtract 3 from BOTH sides before dividing.'],
 explanation='Subtract 3 from both sides to preserve equality: $2x=8$. Divide both sides by 2: $x=4$. Check: $2(4)+3=11$.',
 application='A bicycle hire costs N$5 plus N$2 per hour. The total is N$15. Form an equation and find the number of hours.',
 application_explanation='If $h$ is hours, $5+2h=15$. Subtract 5 then divide by 2, giving $h=5$ hours. Check: $5+2(5)=15$.',
 independent='Without help, solve $3y+4=19$. Explain each operation and check your result.',
 independent_explanation='Subtract 4: $3y=15$. Divide by 3: $y=5$. Check: $3(5)+4=19$.'),
 'proportion': dict(challenge='Three identical notebooks cost N$24. Predict the cost of five and explain your method.',
 hints=['What quantity remains the same for each notebook?', 'Find the price of one notebook first.', 'Divide the total cost by the number of notebooks.'],
 explanation='The unit price is $24/3=8$ Namibian dollars. Five cost $5\\times8=40$ Namibian dollars. This assumes an unchanged price and no discount.',
 application='A bag costs N$80 before a 15% discount. Find the discount and the sale price.',
 application_explanation='The discount is $0.15\\times80=12$. The sale price is $80-12=68$ Namibian dollars.',
 independent='Six identical pens cost N$42. Without help, calculate the cost of nine pens and explain your assumptions.',
 independent_explanation='Each pen costs $42/6=7$ Namibian dollars, so nine cost $9\\times7=63$. Assume the unit price is constant.'),
 'pythagoras': dict(challenge='A right-angled triangle has perpendicular sides 3 cm and 4 cm. Predict its hypotenuse and explain how you would test your prediction.',
 hints=['Which theorem connects the sides of a right-angled triangle?', 'The hypotenuse is opposite the right angle.', 'Square the two perpendicular lengths and add them before taking a square root.'],
 explanation='For a right-angled triangle, $c^2=3^2+4^2=25$. Length is positive, so $c=5$ cm.',
 application='A rectangular field is 5 m by 12 m. What is its diagonal distance? State the geometric assumption.',
 application_explanation='The rectangle has right angles. Its diagonal is $\\sqrt{5^2+12^2}=\\sqrt{169}=13$ m.',
 independent='A right-angled triangle has hypotenuse 10 cm and one shorter side 6 cm. Find the other side without help.',
 independent_explanation='The missing shorter side satisfies $b^2=10^2-6^2=64$, so $b=8$ cm.'),
 'quadratic': dict(challenge='Solve $x^2-5x+6=0$. Predict how many real solutions it might have and suggest a method.',
 hints=['Can you factorise the quadratic?', 'Look for two numbers whose product is 6 and whose sum is negative 5.', 'Write the quadratic as a product of two linear factors, then use the zero-product rule.'],
 explanation='The factors are $(x-2)(x-3)=0$. A product is zero when at least one factor is zero, so $x=2$ or $x=3$. Substitution verifies both.',
 application='A rectangle has sides $x$ metres and $(x+1)$ metres and area 12 square metres. Find the physically valid value of $x$.',
 application_explanation='$x(x+1)=12$, so $(x+4)(x-3)=0$. The algebraic roots are $-4$ and $3$. A side length must be positive, so $x=3$ m.',
 independent='Without help, solve $x^2-7x+10=0$ and check both solutions.',
 independent_explanation='$(x-2)(x-5)=0$, giving $x=2$ or $x=5$. Each makes the original expression zero.'),
 'differentiate': dict(challenge='For $f(x)=x^3-2x$, predict whether the gradient is positive at $x=2$. Explain how you could calculate it.',
 hints=['The derivative gives the gradient at a point.', 'Differentiate each term using the power rule.', 'For $x^n$, multiply by the exponent and reduce that exponent by one.'],
 explanation='$f\u2032(x)=3x^2-2$. At $x=2$, the gradient is $3(2)^2-2=10$, which is positive. This is a gradient, not the height $f(2)$.',
 application='A position model is $s(t)=t^3+2t$ metres. Find the instantaneous velocity at $t=2$ seconds, explaining the units.',
 application_explanation='Velocity is $s\u2032(t)=3t^2+2$, so at 2 seconds it is $14$ m/s.',
 independent='Without help, find the gradient of $g(x)=2x^3-5x$ at $x=1$. Explain your reasoning.',
 independent_explanation='$g\u2032(x)=6x^2-5$, so $g\u2032(1)=1$.'),
 'integrate': dict(challenge='Find an antiderivative of $3x^2+2$. Predict how differentiation could check your result.',
 hints=['Integration reverses differentiation.', 'Increase a power by one and divide by the new power.', 'An indefinite integral needs a constant because differentiation removes constants.'],
 explanation='$\\int(3x^2+2)\\,dx=x^3+2x+C$. Differentiating this expression returns $3x^2+2$.',
 application='A velocity model is $v(t)=2t$ m/s. Find displacement from $t=0$ to $t=3$ seconds using a definite integral.',
 application_explanation='$\\int_0^3 2t\\,dt=[t^2]_0^3=9$ metres. A definite integral evaluates the antiderivative at the two bounds and subtracts.',
 independent='Without help, find $\\int_0^2 3x^2\\,dx$ and explain why the arbitrary constant does not affect the answer.',
 independent_explanation='An antiderivative is $x^3+C$. Evaluating at both limits cancels $C$, leaving $2^3-0^3=8$.')
}


def starter_plan(course,topic_id):
    if topic_id not in [topic['id'] for topic in course['topics']]:
        raise HTTPException(422,'That topic is not available in this class pathway.')
    return deepcopy(LESSONS[topic_id])
